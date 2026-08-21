"""分页与列表查询工具（技术文档 §6.0：limit/offset 分页，page_size 上限 50）。

实现说明：
- 统一分页参数：page（默认 1）/ page_size（默认 12，上限 50）；
- 统一分页响应：{ list, total, page, page_size }；
- 关键词检索统一 LIKE（禁 FTS，ADR-002 双环境约束）。
"""
from fastapi import Query
from pydantic import BaseModel


class PaginationParams:
    """FastAPI 依赖注入的分页参数。"""

    def __init__(
        self,
        page: int = Query(1, ge=1, description="页码，从 1 开始"),
        page_size: int = Query(12, ge=1, le=50, description="每页数量，1-50"),
    ):
        self.page = page
        self.page_size = page_size

    @property
    def offset(self) -> int:
        """limit/offset 的 offset 值。"""
        return (self.page - 1) * self.page_size


class PageResult(BaseModel):
    """分页响应统一结构。"""

    list: list
    total: int
    page: int
    page_size: int


def paginate(items: list, total: int, p: PaginationParams) -> dict:
    """构造统一分页响应体。"""
    return {"list": items, "total": total, "page": p.page, "page_size": p.page_size}
