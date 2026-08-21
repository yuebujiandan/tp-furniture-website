import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Space, Switch, Table, Tag, Upload, message } from "antd";
import type { UploadFile } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { createBanner, deleteBanner, getAdminBanners, updateBanner, BannerItem } from "../api/admin";
import { fileUrl, imageUploadRequest } from "../lib/upload";

/**
 * Banner 管理页（PRD 7.2.1）
 * 实现说明：Banner 列表 + 新建/编辑（1920×780 建议，按钮文字 ≤20 字）+ 删除。
 */
export default function BannersPage() {
  const [list, setList] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BannerItem | null>(null);
  const [form] = Form.useForm();
  // 图片（单图，必填）：上传走 /admin/upload，成功后 URL 由 fileUrl() 提取写入提交（与产品图更换相同方式）
  const [imageFiles, setImageFiles] = useState<UploadFile[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setList(await getAdminBanners()); } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openModal(row?: BannerItem) {
    setEditing(row ?? null);
    form.setFieldsValue(row ?? { sort: 0, is_activate: true });
    // 回填图片（URL 转 UploadFile）
    setImageFiles(row?.image ? [{ uid: "-img", name: "Banner", status: "done", url: row.image }] : []);
    setModalOpen(true);
  }

  async function handleOk() {
    const values = await form.validateFields();
    // Banner 图片必填：未上传则拦截（数据库 image 字段必填）
    const image = fileUrl(imageFiles[0]);
    if (!image) { message.error("请上传 Banner 图片"); return; }
    const payload = { ...values, image };
    try {
      if (editing) { await updateBanner(editing.id, payload); message.success("已更新"); }
      else { await createBanner(payload); message.success("已创建"); }
      setModalOpen(false);
      load();
    } catch { /* 拦截器提示 */ }
  }

  const columns = [
    { title: "预览", dataIndex: "image", width: 120, render: (v: string) => <img src={v} alt="" className="h-10 rounded object-cover" /> },
    { title: "标题", dataIndex: "title", render: (v: string | null) => <span className="text-gold-soft">{v || "-"}</span> },
    { title: "副标题", dataIndex: "subtitle", ellipsis: true },
    { title: "按钮", dataIndex: "button_text", width: 90 },
    { title: "跳转", dataIndex: "link_url", width: 130, ellipsis: true },
    { title: "排序", dataIndex: "sort", width: 70 },
    { title: "状态", dataIndex: "is_activate", width: 80, render: (v: boolean) => (v ? <Tag color="success">启用</Tag> : <Tag color="error">禁用</Tag>) },
    {
      title: "操作", width: 160, render: (_: unknown, r: BannerItem) => (
        <Space>
          <Button size="small" onClick={() => openModal(r)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={async () => { await deleteBanner(r.id); message.success("已删除"); load(); }}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-cream font-serif-title tracking-[2px]">Banner 管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新建 Banner</Button>
      </div>
      <Table rowKey="id" dataSource={list} columns={columns} loading={loading} pagination={false} />

      <Modal title={editing ? "编辑 Banner" : "新建 Banner"} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          {/* ---- 图片（单图，必填，上传走 /admin/upload，与产品图更换相同方式）---- */}
          <Form.Item label="图片（建议 1920×780，UIUX §13.2）" required>
            <Upload
              listType="picture-card"
              maxCount={1}
              accept="image/*"
              fileList={imageFiles}
              customRequest={imageUploadRequest}
              onChange={({ fileList }) => setImageFiles(fileList)}
              onRemove={() => setImageFiles([])}
            >
              {imageFiles.length === 0 && (
                <div>
                  <PlusOutlined />
                  <div className="text-xs mt-1">上传图片</div>
                </div>
              )}
            </Upload>
          </Form.Item>
          <Form.Item name="title" label="标题"><Input maxLength={100} /></Form.Item>
          <Form.Item name="subtitle" label="副标题"><Input maxLength={200} /></Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="button_text" label="按钮文字（≤20 字）"><Input maxLength={20} /></Form.Item>
            <Form.Item name="link_url" label="跳转链接"><Input placeholder="/products" /></Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="sort" label="排序（小在前）"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="is_activate" label="启用" valuePropName="checked"><Switch /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
