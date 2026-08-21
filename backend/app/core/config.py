"""应用配置 —— 单例读取环境变量（技术文档 §2.4 / 双环境 DATABASE_URL 切换 ADR-002）。

所有配置通过环境变量注入，代码禁止硬编码。
生产环境强制校验：APP_ENV=prod 时 JWT_SECRET_KEY 不得为默认值、DATABASE_URL 必须为 PostgreSQL。
"""
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(BASE_DIR / ".env"), env_file_encoding="utf-8", extra="ignore")

    # ---- 运行环境 ----
    APP_ENV: str = "dev"  # dev / test / prod
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174"

    # ---- 数据库（双环境切换核心，ADR-002）----
    DATABASE_URL: str = "sqlite:///./dev.db"

    # ---- JWT（PRD 6.7.1：access ≤24h + refresh 30d）----
    JWT_SECRET_KEY: str = "change-me-in-prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ---- 文件存储（PRD 7.0：图片 ≤5MB / 简历附件 ≤10MB）----
    UPLOAD_DIR: str = "./uploads"
    STATIC_URL: str = "/static"
    MAX_IMAGE_SIZE_MB: int = 5
    MAX_FILE_SIZE_MB: int = 10

    # ---- 短信（预留抽象，R4 降级）----
    SMS_PROVIDER: str = "mock"  # mock / aliyun / tencent
    SMS_SIGN_NAME: str = "TP全屋家居"
    SMS_TEMPLATE_CODE: str = "SMS_123456"
    SMS_ACCESS_KEY_ID: str = ""
    SMS_ACCESS_KEY_SECRET: str = ""

    # ---- 地图（门店标注，R5 降级静态图）----
    MAP_PROVIDER: str = "amap"  # amap / tencent
    MAP_JS_KEY: str = ""

    # ---- Redis（可选，缺失自动降级）----
    REDIS_URL: str = ""

    # ---- 系统初始化（PRD §11.2）----
    ADMIN_INIT_USERNAME: str = "admin"
    ADMIN_INIT_PASSWORD: str = "admin123"

    # ---- 安全（PRD 9.2）----
    LOGIN_FAIL_LIMIT: int = 5
    LOGIN_FAIL_LOCK_MINUTES: int = 15
    SMS_MINUTE_LIMIT: int = 1
    SMS_DAILY_LIMIT: int = 5

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @field_validator("APP_ENV")
    @classmethod
    def validate_env(cls, v: str) -> str:
        if v not in ("dev", "test", "prod"):
            raise ValueError("APP_ENV 仅支持 dev / test / prod")
        return v

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database(cls, v: str, info) -> None:
        env = info.data.get("APP_ENV", "dev")
        if env == "prod" and not v.startswith("postgresql"):
            raise ValueError("生产环境 DATABASE_URL 必须为 PostgreSQL")
        return v

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret(cls, v: str, info) -> str:
        env = info.data.get("APP_ENV", "dev")
        if env == "prod" and v == "change-me-in-prod":
            raise ValueError("生产环境必须设置强 JWT_SECRET_KEY")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
