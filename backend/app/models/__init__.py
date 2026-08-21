"""模型聚合入口 —— 导入全部 8 域 32 表，供 Alembic autogenerate 与 Base.metadata 使用。"""
from app.db.base import Base

from app.models.user import (
    DealerApplications,
    Departments,
    OperationLogs,
    Roles,
    StaffUsers,
    Users,
)
from app.models.product import (
    Favorites,
    ProductSpaces,
    Products,
    Series,
    Spaces,
)
from app.models.content import (
    Announcements,
    Banners,
    Cases,
    Documents,
    Faqs,
    Milestones,
    News,
    Stores,
)
from app.models.lead import (
    Appointments,
    EngineeringRequests,
    FranchiseApplications,
    Inquiries,
    Messages,
)
from app.models.contract import (
    ContractLogs,
    Contracts,
    DealerPurchaseIntents,
)
from app.models.job import Jobs, Resumes
from app.models.stat import VisitStatDevices, VisitStats
from app.models.system import SiteConfigs

__all__ = [
    "Base",
    # 用户权限域
    "Users", "DealerApplications", "StaffUsers", "Departments", "Roles", "OperationLogs",
    # 产品域
    "Series", "Spaces", "Products", "ProductSpaces", "Favorites",
    # 内容域
    "News", "Cases", "Banners", "Milestones", "Stores", "Faqs", "Announcements", "Documents",
    # 业务线索域
    "Appointments", "Messages", "Inquiries", "FranchiseApplications", "EngineeringRequests",
    # 签单域
    "Contracts", "ContractLogs", "DealerPurchaseIntents",
    # 招聘域
    "Jobs", "Resumes",
    # 统计域
    "VisitStats", "VisitStatDevices",
    # 系统域
    "SiteConfigs",
]
