"""通用上传接口（技术文档 §6.6.8 / PRD 9.2）。

实现说明：
- 路径 /admin/upload，需后台登录（任意有权限员工即可，超级管理员全放行）；
- 支持图片（jpg/png/webp ≤5MB，压缩+缩略图）与文档（pdf/doc/docx ≤10MB）；
- 安全：扩展名 + 文件头双校验，uuid 重命名，按日期分目录。
"""
from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.deps import get_current_staff
from app.core.exceptions import PARAM_ERROR, BizError, ok
from app.models import StaffUsers
from app.utils import file as file_util

router = APIRouter(prefix="/admin", tags=["后台-通用"])


@router.post("/upload")
def upload(
    file: UploadFile = File(...),
    kind: str = Form("image"),
    staff: StaffUsers = Depends(get_current_staff),
):
    """通用上传：kind = image | doc（默认 image）。"""
    if kind not in ("image", "doc"):
        raise BizError(PARAM_ERROR, "kind 仅支持 image / doc")
    result = file_util.save_upload(file, kind)  # type: ignore[arg-type]
    return ok(result)
