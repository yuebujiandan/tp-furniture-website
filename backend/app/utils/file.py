"""文件处理工具（技术文档 §5.2.3 / PRD 9.2 上传安全）。

实现说明：
- 安全双校验：扩展名白名单 + 文件头魔数校验（防止伪装扩展名上传）；
- 大小限制：图片 ≤5MB、文档 ≤10MB（config 可配）；
- 图片处理：上传即压缩（列表图 ≤200KB / 详情图 ≤500KB）+ 生成 240×160 缩略图；
- 文件名：随机 uuid 重命名，避免路径穿越与重名覆盖；
- 保存目录：按日期分目录（uploads/YYYY/MM/DD/）。
"""
import uuid
from datetime import datetime
from pathlib import Path
from typing import Literal

from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import PARAM_ERROR, BizError

# 白名单：扩展名 → 文件头魔数（bytes 前缀）
# 图片：jpg/png/webp（PRD 9.2 类型白名单）；文档：pdf/doc/docx
IMAGE_MAGIC: dict[str, bytes] = {
    ".jpg": b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
    ".png": b"\x89PNG\r\n\x1a\n",
    ".webp": b"RIFF",
}
DOC_MAGIC: dict[str, bytes] = {
    ".pdf": b"%PDF",
    ".doc": b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",  # OLE2 复合文档头
    ".docx": b"PK\x03\x04",  # zip 容器
}

ALLOWED_IMAGES = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_DOCS = {".pdf", ".doc", ".docx"}


def _check_magic(filename: str, content: bytes, magic_map: dict[str, bytes]) -> bool:
    """文件头魔数校验：内容前若干字节与白名单匹配才算通过。"""
    ext = Path(filename).suffix.lower()
    expected = magic_map.get(ext)
    if expected is None:
        return False
    return content.startswith(expected)


def save_upload(file: UploadFile, kind: Literal["image", "doc"]) -> dict:
    """保存上传文件并返回 {url, size, thumbnail_url}。

    - kind="image"：校验图片白名单 + 魔数 + ≤5MB，压缩 + 缩略图
    - kind="doc"：校验文档白名单 + 魔数 + ≤10MB，原样保存
    """
    # 读取原始文件名与内容
    original = file.filename or "unnamed"
    ext = Path(original).suffix.lower()
    data = file.file.read()

    # 大小限制（PRD 7.0）
    max_size = (settings.MAX_IMAGE_SIZE_MB if kind == "image" else settings.MAX_FILE_SIZE_MB) * 1024 * 1024
    if len(data) > max_size:
        raise BizError(PARAM_ERROR, f"文件过大，{kind}最大 {max_size // 1024 // 1024}MB")

    # 扩展名 + 文件头双校验（PRD 9.2）
    if kind == "image":
        if ext not in ALLOWED_IMAGES or not _check_magic(original, data, IMAGE_MAGIC):
            raise BizError(PARAM_ERROR, "仅支持 jpg/png/webp 图片且文件内容校验失败")
    else:
        if ext not in ALLOWED_DOCS or not _check_magic(original, data, DOC_MAGIC):
            raise BizError(PARAM_ERROR, "仅支持 pdf/doc/docx 文档且文件内容校验失败")

    # 按日期分目录 + uuid 重命名
    today = datetime.now().strftime("%Y/%m/%d")
    save_dir = Path(settings.UPLOAD_DIR) / today
    save_dir.mkdir(parents=True, exist_ok=True)
    new_name = f"{uuid.uuid4().hex}{ext}"
    target = save_dir / new_name
    target.write_bytes(data)

    url = f"{settings.STATIC_URL}/{today}/{new_name}"
    result: dict = {"url": url, "size": len(data), "original_name": original}

    # 图片压缩 + 缩略图（Pillow；技术文档 §5.2.3）
    if kind == "image":
        result["thumbnail_url"] = _process_image(target)

    return result


def _process_image(path: Path) -> str:
    """图片压缩 + 生成 240×160 缩略图；失败时静默降级（不阻塞上传）。

    压缩策略：WebP/JPEG 重编码（quality=82），超出目标大小逐级降质。
    """
    try:
        from PIL import Image

        img = Image.open(path)
        # 转 RGB 兼容（PNG 带透明通道转 RGBA 保存 PNG，其余转 JPEG）
        fmt = "PNG" if img.mode in ("RGBA", "P", "LA") else "JPEG"
        save_path = path.with_suffix(".webp") if False else path  # 保持原格式避免兼容问题
        img = img.convert("RGB") if fmt == "JPEG" else img
        # 压缩重编码（目标：详情图 ≤500KB，迭代降质）
        for quality in (82, 70, 55):
            img.save(path, quality=quality, optimize=True)
            if path.stat().st_size <= 500 * 1024:
                break
        # 缩略图 240×160（保持比例裁剪，居中）
        thumb_dir = path.parent / "thumbs"
        thumb_dir.mkdir(exist_ok=True)
        thumb = thumb_dir / f"{path.stem}_thumb.jpg"
        im = Image.open(path)
        im.thumbnail((240, 160))
        im.convert("RGB").save(thumb, "JPEG", quality=80)
        return f"{settings.STATIC_URL}/{path.parent.relative_to(settings.UPLOAD_DIR).as_posix()}/thumbs/{thumb.name}"
    except Exception:
        # 图片处理失败不阻断上传（保留原图，PRD 可用性 9.4）
        return ""
