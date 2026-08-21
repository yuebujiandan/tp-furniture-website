"""数据库会话（DATABASE_URL 驱动双环境，ADR-002）。

SQLite 开发：连接串 sqlite:///./dev.db（check_same_thread=False）
PostgreSQL 生产：postgresql+psycopg://...
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

connect_args = {}
engine_kwargs: dict = {"pool_pre_ping": True}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # PostgreSQL 生产：连接池（技术文档 §11.1 pool_size=20）
    engine_kwargs.update(pool_size=20, max_overflow=10)

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, **engine_kwargs)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db():
    """FastAPI 依赖：请求级会话。"""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
