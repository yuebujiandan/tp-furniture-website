import type { UploadFile, UploadProps } from "antd";
import { uploadFile } from "../api/admin";

/**
 * 共享图片上传工具（与产品图更换 ProductList 完全一致的方式）
 * 设计说明：
 * - 统一走后台 /admin/upload 接口（图片校验 + 缩略图），避免各模块重复实现；
 * - AntD Upload 的 customRequest 把上传结果 {url} 写回 file.response，
 *   Upload 组件再通过 response.url 回填 file.url 供取值；
 * - fileUrl() 兼容「已存在 URL（编辑回填）」与「刚上传 response.url（新建/换图）」两种来源。
 * 适用模块：产品封面/图集、新闻封面、案例封面、Banner 图片、门店图片。
 */

/** 单图上传：customRequest 调 /admin/upload，成功后写入 file.response */
export const imageUploadRequest: UploadProps["customRequest"] = async ({ file, onSuccess, onError }) => {
  try {
    const res = await uploadFile(file as File, "image");
    onSuccess?.(res);
  } catch (e) {
    onError?.(e as Error);
  }
};

/** 从 UploadFile 提取真实 URL（兼容回填 URL 与刚上传 response） */
export function fileUrl(f: UploadFile | undefined): string | undefined {
  if (!f) return undefined;
  return f.url ?? (f.response as { url?: string } | undefined)?.url;
}
