import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Space, Switch, Table, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { deleteSeries, getAdminSeries, createSeries, updateSeries, SeriesItem } from "../api/admin";

/**
 * 系列管理页（PRD 7.1.1 / 技术文档 §6.6.2）
 * 实现说明：系列列表（含产品数）+ 新建/编辑（Modal 表单）+ 删除（有产品时后端降级禁用）。
 */
export default function SeriesPage() {
  const [list, setList] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SeriesItem | null>(null);
  const [form] = Form.useForm();

  /** 加载系列列表 */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(await getAdminSeries());
    } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /** 打开新建/编辑弹窗 */
  function openModal(row?: SeriesItem) {
    setEditing(row ?? null);
    form.setFieldsValue(row ? { name: row.name, intro: row.intro, sort: row.sort, is_activate: row.is_activate } : { sort: 0, is_activate: true });
    setModalOpen(true);
  }

  /** 提交新建/编辑 */
  async function handleOk() {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateSeries(editing.id, values);
        message.success("系列已更新");
      } else {
        await createSeries(values);
        message.success("系列已创建");
      }
      setModalOpen(false);
      load();
    } catch { /* 拦截器提示 */ }
  }

  /** 删除（Popconfirm 二次确认，PRD 7.0） */
  async function handleDelete(id: number) {
    try {
      const res = await deleteSeries(id);
      message.success(res.deleted ? "已删除" : "系列下存在产品，已改为禁用");
      load();
    } catch { /* 拦截器提示 */ }
  }

  const columns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "系列名称", dataIndex: "name", render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "简介", dataIndex: "intro", ellipsis: true },
    { title: "排序", dataIndex: "sort", width: 70 },
    { title: "产品数", dataIndex: "product_count", width: 80, render: (v: number) => <Tag color="gold">{v}</Tag> },
    { title: "状态", dataIndex: "is_activate", width: 80, render: (v: boolean) => (v ? <Tag color="success">启用</Tag> : <Tag color="error">禁用</Tag>) },
    {
      title: "操作", width: 160, render: (_: unknown, row: SeriesItem) => (
        <Space>
          <Button size="small" onClick={() => openModal(row)}>编辑</Button>
          <Popconfirm title="确认删除该系列？" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-cream font-serif-title tracking-[2px]">系列管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新建系列</Button>
      </div>
      <Table rowKey="id" dataSource={list} columns={columns} loading={loading} pagination={false} />

      {/* 新建/编辑弹窗 */}
      <Modal title={editing ? "编辑系列" : "新建系列"} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="系列名称" rules={[{ required: true, message: "请输入系列名称" }]}>
            <Input maxLength={50} placeholder="如：胡桃禮（Q1 确认后替换占位名）" />
          </Form.Item>
          <Form.Item name="intro" label="简介"><Input maxLength={255} /></Form.Item>
          <Form.Item name="sort" label="排序（小在前）"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="is_activate" label="启用" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
