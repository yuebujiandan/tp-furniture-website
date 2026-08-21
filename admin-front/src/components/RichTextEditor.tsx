import { Editor } from "@tinymce/tinymce-react";
import tinymce from "tinymce/tinymce";

// ---- TinyMCE 自托管（打包进 bundle，无 CDN / 域名注册；v7+ 需声明 license_key）----
import "tinymce/models/dom/model";
import "tinymce/themes/silver";
import "tinymce/icons/default";
import "tinymce/skins/ui/oxide/skin.min.css";
import "tinymce/plugins/image";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/table";
import "tinymce/plugins/code";
import "tinymce/plugins/media";
import "tinymce/plugins/wordcount";
import "tinymce/plugins/autoresize";
import contentCss from "tinymce/skins/content/default/content.min.css?inline";
import contentUiCss from "tinymce/skins/ui/oxide/content.min.css?inline";

import { uploadFile } from "../api/admin";

interface Props {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}

/**
 * 自托管富文本编辑器（TinyMCE）
 * - 仅本组件引入 TinyMCE，复用后台 /admin/upload 上传图片（自动携带员工 token，与产品图一致）；
 * - 内容以 HTML 字符串存储（detail_html 等字段），前台 DOMPurify 清洗后渲染；
 * - 通过 value / onChange 接入 AntD Form（受控组件）。
 */
export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  return (
    <Editor
      tinymce={tinymce}
      value={value ?? ""}
      onEditorChange={(html) => onChange?.(html)}
      init={{
        height: 480,
        menubar: false,
        branding: false,
        // TinyMCE v7+ 强制要求 license_key；本项目为开源自用，声明 GPL 即启用
        // （见 https://www.tiny.cloud/docs/tinymce/8/license-key/）
        license_key: "gpl",
        // 中文工具栏（自托管语言包，放在 public/langs/zh_CN.js，同源加载）
        language: "zh_CN",
        language_url: "/langs/zh_CN.js",
        placeholder: placeholder ?? "请输入产品介绍，支持文字、图片、表格等…",
        // 自托管：禁用 TinyMCE 自动拉取 skin / content CSS（已由上方 import 注入）
        skin: false,
        content_css: false,
        content_style: [
          contentUiCss,
          contentCss,
          "body{font-family:-apple-system,'Microsoft YaHei',sans-serif;font-size:14px;line-height:1.7;color:#1f1f1f}",
          "img{max-width:100%;height:auto;border-radius:8px}",
          "table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:6px 10px}",
        ].join("\n"),
        plugins: "image link lists table code media wordcount autoresize",
        toolbar:
          "undo redo | blocks | bold italic underline strikethrough | forecolor | alignleft aligncenter alignright | bullist numlist | link image | table | code",
        // 图片上传：走后台 /admin/upload（携带员工 token，返回 /static/... 可访问 URL）
        images_upload_handler: async (blobInfo) => {
          const file = blobInfo.blob() as File;
          const res = await uploadFile(file, "image");
          return res.url;
        },
        paste_data_images: true,
        automatic_uploads: true,
        file_picker_types: "image",
        // 保留后台返回的 /static/... 路径，不做绝对化转换（前台经 Vite 代理可访问）
        convert_urls: false,
      }}
    />
  );
}
