import redis
from .config import settings

# Initialize Redis client (using connection pool)
pool = redis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)
redis_client = redis.Redis(connection_pool=pool)

def check_rate_limit(key: str, limit: int = 60, window: int = 60) -> bool:
    """
    Returns True if the rate limit is exceeded, False otherwise.
    Uses window sliding-log / counter with expire.
    """
    try:
        current = redis_client.get(key)
        if current is not None:
            if int(current) >= limit:
                return True
            redis_client.incr(key)
        else:
            redis_client.set(key, 1, ex=window)
        return False
    except Exception as e:
        # If Redis is unavailable, log and allow the request (fail-open to prevent user blockage)
        print(f"Redis error in check_rate_limit: {e}")
        return False

def cache_session(token: str, user_data: str, ttl: int = 3600):
    try:
        redis_client.set(f"session:{token}", user_data, ex=ttl)
    except Exception as e:
        print(f"Redis error caching session: {e}")

def get_cached_session(token: str) -> str:
    try:
        return redis_client.get(f"session:{token}")
    except Exception as e:
        print(f"Redis error getting cached session: {e}")
        return None

def delete_cached_session(token: str):
    try:
        redis_client.delete(f"session:{token}")
    except Exception as e:
        print(f"Redis error deleting session: {e}")
