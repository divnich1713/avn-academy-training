import redis.asyncio as aioredis
from config import settings

# Initialize asynchronous Redis client (using connection pool)
pool = aioredis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)
redis_client = aioredis.Redis(connection_pool=pool)

async def check_rate_limit(key: str, limit: int = 60, window: int = 60) -> bool:
    """
    Returns True if the rate limit is exceeded, False otherwise.
    Uses atomic INCR and EXPIRE to prevent race conditions (TOCTOU).
    """
    try:
        # Atomic increment
        current = await redis_client.incr(key)
        if current == 1:
            # Set TTL on first request in the window
            await redis_client.expire(key, window)
        return current > limit
    except Exception as e:
        # If Redis is unavailable, log and allow the request (fail-open to prevent user blockage)
        print(f"Redis error in check_rate_limit: {e}")
        return False

async def cache_session(token: str, user_data: str, ttl: int = 3600):
    try:
        await redis_client.set(f"session:{token}", user_data, ex=ttl)
    except Exception as e:
        print(f"Redis error caching session: {e}")

async def get_cached_session(token: str) -> str:
    try:
        return await redis_client.get(f"session:{token}")
    except Exception as e:
        print(f"Redis error getting cached session: {e}")
        return None

async def delete_cached_session(token: str):
    try:
        await redis_client.delete(f"session:{token}")
    except Exception as e:
        print(f"Redis error deleting session: {e}")
