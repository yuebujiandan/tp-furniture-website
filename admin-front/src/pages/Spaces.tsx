import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { deleteSpace, getAdminSpaces, createSpace, updateSpace, SpaceItem } from "../api/admin";

/**
 * 空间分类管理页（PRD 7.1.1）
 * 实现说明：空间列表 + 新建/编辑 + 删除（有产品引用时后端降级禁用）。
 */
export default function SpacesPage() {
  const [list, setList] = useState<SpaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SpaceItem | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { setList(await getAdminSpaces()); } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openModal(row?: SpaceItem) {
    setEditing(row ?? null);
    form.setFieldsValue(row ? { name: row.name, icon: row.icon, sort: row.sort } : { sort: 0 });
    setModalOpen(true);
  }

  async function handleOk() {
    const values = await form.validateFields();
    try {
      if (editing) { await updateSpace(editing.id, values); message.success("已更新"); }
      else { await createSpace(values); message.success("已创建"); }
      setModalOpen(false);
      load();
    } catch { /* 拦截器提示 */ }
  }

  async function handleDelete(id: number) {
    try {
      const res = await deleteSpace(id);
      message.success(res.deleted ? "已删除" : "空间下存在产品，已改为禁用");
      load();
    } catch { /* 拦截器提示 */ }
  }

  const columns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "空间名称", dataIndex: "name", render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "排序", dataIndex: "sort", width: 70 },
    { title: "状态", dataIndex: "is_activate", width: 80, render: (v: boolean) => (v ? <Tag color="success">启用</Tag> : <Tag color="error">禁用</Tag>) },
    {
      title: "操作", width: 160, render: (_: unknown, row: SpaceItem) => (
        <Space>
          <Button size="small" onClick={() => openModal(row)}>编辑</Button>
          <Popconfirm title="确认删除该空间？" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-cream font-serif-title tracking-[2px]">空间分类</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新建空间</Button>
      </div>
      <Table rowKey="id" dataSource={list} columns={columns} loading={loading} pagination={false} />

      <Modal title={editing ? "编辑空间" : "新建空间"} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="空间名称" rules={[{ required: true, message: "请输入空间名称" }]}>
            <Input maxLength={50} placeholder="如：客厅 / 卧室 / 餐厅" />
          </Form.Item>
          <Form.Item name="icon" label="图标 URL"><Input placeholder="可选" /></Form.Item>
          <Form.Item name="sort" label="排序（小在前）"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
