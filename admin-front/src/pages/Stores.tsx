import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Space, Switch, Table, Tag, Upload, message } from "antd";
import type { UploadFile } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { createStore, deleteStore, getAdminStores, updateStore, StoreItem } from "../api/admin";
import { fileUrl, imageUploadRequest } from "../lib/upload";

/**
 * 门店管理页（PRD 7.2.1）
 * 实现说明：门店列表 + 新建/编辑（含经纬度，供前台地图标点）+ 删除。
 */
export default function StoresPage() {
  const [list, setList] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StoreItem | null>(null);
  const [form] = Form.useForm();
  // 门店图（单图，可选）：上传走 /admin/upload，成功后 URL 由 fileUrl() 提取写入提交（与产品图更换相同方式）
  const [imageFiles, setImageFiles] = useState<UploadFile[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setList(await getAdminStores()); } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openModal(row?: StoreItem) {
    setEditing(row ?? null);
    form.setFieldsValue(row ?? { sort: 0, is_activate: true });
    // 回填门店图（URL 转 UploadFile）
    setImageFiles(row?.image ? [{ uid: "-img", name: "门店图", status: "done", url: row.image }] : []);
    setModalOpen(true);
  }

  async function handleOk() {
    const values = await form.validateFields();
    // 门店图 URL 写回提交（数据库 image 字段，可为空）
    const payload = { ...values, image: fileUrl(imageFiles[0]) ?? null };
    try {
      if (editing) { await updateStore(editing.id, payload); message.success("已更新"); }
      else { await createStore(payload); message.success("已创建"); }
      setModalOpen(false);
      load();
    } catch { /* 拦截器提示 */ }
  }

  const columns = [
    { title: "门店名称", dataIndex: "name", render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "地址", dataIndex: "address", ellipsis: true },
    { title: "电话", dataIndex: "phone", width: 130 },
    { title: "营业时间", dataIndex: "business_hours", width: 130 },
    { title: "经纬度", width: 140, render: (_: unknown, r: StoreItem) => (r.lat && r.lng) ? `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}` : "-" },
    { title: "状态", dataIndex: "is_activate", width: 80, render: (v: boolean) => (v ? <Tag color="success">启用</Tag> : <Tag color="error">禁用</Tag>) },
    {
      title: "操作", width: 160, render: (_: unknown, r: StoreItem) => (
        <Space>
          <Button size="small" onClick={() => openModal(r)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={async () => { await deleteStore(r.id); message.success("已删除"); load(); }}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-cream font-serif-title tracking-[2px]">门店管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新建门店</Button>
      </div>
      <Table rowKey="id" dataSource={list} columns={columns} loading={loading} pagination={false} />

      <Modal title={editing ? "编辑门店" : "新建门店"} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="门店名称" rules={[{ required: true }]}><Input maxLength={100} /></Form.Item>
          <Form.Item name="address" label="地址" rules={[{ required: true }]}><Input maxLength={255} /></Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="lat" label="纬度"><InputNumber step={0.000001} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="lng" label="经度"><InputNumber step={0.000001} style={{ width: "100%" }} /></Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="phone" label="电话"><Input maxLength={20} /></Form.Item>
            <Form.Item name="business_hours" label="营业时间"><Input placeholder="9:00-18:00" /></Form.Item>
          </div>
          {/* ---- 门店图（单图，可选，上传走 /admin/upload，与产品图更换相同方式）---- */}
          <Form.Item label="门店图（可选）">
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
                  <div className="text-xs mt-1">上传门店图</div>
                </div>
              )}
            </Upload>
          </Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="sort" label="排序（小在前）"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          </div>
          <Form.Item name="is_activate" label="启用" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
