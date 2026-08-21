"""短信服务抽象（技术文档 §5.3 / R4 降级）。

设计说明：
- 定义 SMSProvider 接口，业务代码只依赖抽象，不感知具体渠道；
- 默认 MockProvider：开发环境将验证码输出到日志/控制台，便于联调；
- 生产可接入 aliyun / tencent 渠道（需配置 SMS_ACCESS_KEY_ID/SECRET，本期留接口不实现）。
"""
import logging
from abc import ABC, abstractmethod

from app.core.config import settings

logger = logging.getLogger(__name__)


class SMSProvider(ABC):
    """短信发送抽象接口。"""

    @abstractmethod
    def send(self, phone: str, template_code: str, params: dict) -> bool:
        """发送短信；返回是否成功。params 为模板变量，如 {"code": "123456"}。"""
        raise NotImplementedError


class MockSMSProvider(SMSProvider):
    """开发环境 Mock：验证码打印到日志（不真正发送）。"""

    def send(self, phone: str, template_code: str, params: dict) -> bool:
        code = params.get("code", "")
        logger.info("[MOCK-SMS] 向 %s 发送验证码 %s（模板 %s）", phone, code, template_code)
        print(f"[MOCK-SMS] 手机号 {phone} 验证码：{code}")  # 联调时控制台可见
        return True


class AliSMSProvider(SMSProvider):
    """阿里云短信（预留：接入时实现签名与调用）。"""

    def send(self, phone: str, template_code: str, params: dict) -> bool:
        # TODO(R4 降级后接入)：使用 aliyun-python-sdk-core 发送
        raise NotImplementedError("阿里云短信通道未接入，请配置 SMS_PROVIDER=mock")


def get_sms_provider() -> SMSProvider:
    """根据配置返回短信渠道实例（工厂方法，单点创建）。"""
    provider_map: dict[str, SMSProvider] = {
        "mock": MockSMSProvider(),
        "aliyun": AliSMSProvider(),
    }
    return provider_map.get(settings.SMS_PROVIDER, MockSMSProvider())


def send_verify_code(phone: str) -> str:
    """发送验证码（业务入口）：生成 → 保存 → 发送，返回验证码（Mock 场景便于测试）。

    注意：生产环境不应返回验证码明文，此处仅开发联调便利；生产接线后改为返回 None。
    """
    from app.utils import verify_code as vc

    code = vc.generate_code()
    vc.save_code(f"sms:{phone}", code)
    provider = get_sms_provider()
    provider.send(phone, settings.SMS_TEMPLATE_CODE, {"code": code})
    return code
