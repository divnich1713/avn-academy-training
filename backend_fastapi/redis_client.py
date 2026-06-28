import logging
import redis.asyncio as aioredis
from config import settings

logger = logging.getLogger(__name__)

# Initialize asynchronous Redis client (using connection pool)
pool = aioredis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)
redis_client = aioredis.Redis(connection_pool=pool)

# Lua script for atomic rate limiting (INCR + EXPIRE in one round-trip)
_RATE_LIMIT_SCRIPT = """
local current = redis.call('INCR', KEYS[1])
if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
"""

async def check_rate_limit(key: str, limit: int = 60, window: int = 60) -> bool:
    """
    Returns True if the rate limit is exceeded, False otherwise.
    Uses a Lua script for atomic INCR+EXPIRE to prevent race conditions.
    """
    try:
        current = await redis_client.eval(_RATE_LIMIT_SCRIPT, 1, key, window)
        return current > limit
    except Exception as e:
        # If Redis is unavailable, fail-open to prevent blocking users.
        # TODO: Add in-memory fallback counter (e.g. collections.defaultdict + time window)
        #       to provide basic rate limiting even when Redis is down.
        logger.warning(f"Redis error in check_rate_limit: {e}")
        return False

async def cache_session(token: str, user_data: str, ttl: int = 3600):
    try:
        await redis_client.set(f"session:{token}", user_data, ex=ttl)
    except Exception as e:
        logger.warning(f"Redis error caching session: {e}")

async def get_cached_session(token: str) -> str:
    try:
        return await redis_client.get(f"session:{token}")
    except Exception as e:
        logger.warning(f"Redis error getting cached session: {e}")
        return None

async def delete_cached_session(token: str):
    try:
        await redis_client.delete(f"session:{token}")
    except Exception as e:
        logger.warning(f"Redis error deleting session: {e}")
