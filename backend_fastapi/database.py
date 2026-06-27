from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

# Create async engine with optimized connection pooling for high-concurrency loads
engine = create_async_engine(
    settings.async_database_url,
    pool_pre_ping=True,
    echo=False,
    pool_size=20,          # Standard pool size of active connections
    max_overflow=30,       # Allow burst of up to 30 additional connections
    pool_timeout=30,       # Wait up to 30s for a connection before raising TimeoutError
    pool_recycle=1800      # Recycle connections older than 30 minutes to prevent stales
)

# Async session maker
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
