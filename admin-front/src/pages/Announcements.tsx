import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  createAnnouncement, deleteAnnouncement, getAdminAnnouncements, getAdminAnnouncement,
  updateAnnouncement, getAdminDocuments, createDocument, updateDocument, deleteDocument, DocItem,
} from "../api/admin";
import RichTextEditor from "../components/RichTextEditor";

/**
 * 公告与政策文档管理页（PRD 7.3.6 / 技术文档 §6.6.10）
 * 实现说明：公告 Tab（全部/指定经销商 scope + 草稿/发布 + CRUD）+ 政策文档 Tab（CRUD）。
 */
export default function AnnouncementsPage() {
  // 公告
  const [list, setList] = useState<Awaited<ReturnType<typeof getAdminAnnouncements>>["list"]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  // 文档
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [docModal, setDocModal] = useState(false);
  const [docEdit, setDocEdit] = useState<DocItem | null>(null);
  const [docForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, d] = await Promise.all([getAdminAnnouncements({ page, page_size: 10 }), getAdminDocuments()]);
      setList(a.list); setTotal(a.total);
      setDocs(d);
    } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  /** 打开公告表单 */
  async function openForm(id?: number) {
    setEditingId(id ?? null);
    if (id) {
      const a = await getAdminAnnouncement(id);
      form.setFieldsValue({ title: a.title, content_html: a.content_html, scope: a.scope, dealer_ids: (a.dealer_ids || []).join(","), status: a.status });
    } else {
      form.resetFields();
      form.setFieldsValue({ scope: "all", status: "draft" });
    }
    setModalOpen(true);
  }

  async function handleOk() {
    const values = await form.validateFields();
    try {
      const payload = { ...values, dealer_ids: values.dealer_ids ? String(values.dealer_ids).split(",").map(Number).filter(Boolean) : [] };
      if (editingId) { await updateAnnouncement(editingId, payload); message.success("已更新"); }
      else { await createAnnouncement(payload); message.success("已创建"); }
      setModalOpen(false);
      load();
    } catch { /* 拦截器提示 */ }
  }

  /** 文档表单提交 */
  async function handleDocOk() {
    const values = await docForm.validateFields();
    try {
      if (docEdit) { await updateDocument(docEdit.id, values); message.success("已更新"); }
      else { await createDocument(values); message.success("已创建"); }
      setDocModal(false);
      load();
    } catch { /* 拦截器提示 */ }
  }

  const columns = [
    { title: "标题", dataIndex: "title", render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "范围", dataIndex: "scope", width: 90, render: (v: string) => (v === "dealer" ? <Tag color="gold">指定经销商</Tag> : <Tag>全部</Tag>) },
    { title: "状态", dataIndex: "status", width: 90, render: (v: string) => (v === "published" ? <Tag color="success">已发布</Tag> : <Tag color="warning">草稿</Tag>) },
    { title: "发布时间", dataIndex: "publish_time", width: 120, render: (v: string | null) => v ? new Date(v).toLocaleDateString("zh-CN") : "-" },
    {
      title: "操作", width: 160, render: (_: unknown, r: { id: number }) => (
        <Space>
          <Button size="small" onClick={() => openForm(r.id)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={async () => { await deleteAnnouncement(r.id); load(); }}><Button size="small" danger>删除</Button></Popconfirm>
        </Space>
      ),
    },
  ];

  const docColumns = [
    { title: "文档标题", dataIndex: "title", render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "文件", dataIndex: "file_url", ellipsis: true },
    { title: "大小", dataIndex: "file_size", width: 90, render: (v: number | null) => v ? `${(v / 1024).toFixed(0)}KB` : "-" },
    { title: "排序", dataIndex: "sort", width: 70 },
    {
      title: "操作", width: 160, render: (_: unknown, r: DocItem) => (
        <Space>
          <Button size="small" onClick={() => { setDocEdit(r); docForm.setFieldsValue(r); setDocModal(true); }}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={async () => { await deleteDocument(r.id); load(); }}><Button size="small" danger>删除</Button></Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-cream font-serif-title tracking-[2px]">公告与文档</h2>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>新建公告</Button>
          <Button icon={<PlusOutlined />} onClick={() => { setDocEdit(null); docForm.resetFields(); setDocModal(true); }}>新建文档</Button>
        </Space>
      </div>

      <Tabs
        items={[
          { key: "ann", label: "经销商公告", children: <Table rowKey="id" dataSource={list} columns={columns} loading={loading} pagination={{ current: page, total, pageSize: 10, onChange: setPage }} /> },
          { key: "docs", label: "政策文档", children: <Table rowKey="id" dataSource={docs} columns={docColumns} loading={loading} pagination={false} /> },
        ]}
      />

      {/* 公告表单 */}
      <Modal title={editingId ? "编辑公告" : "新建公告"} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} width={640} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input maxLength={200} /></Form.Item>
          <Form.Item name="content_html" label="正文（富文本，支持图文）"><RichTextEditor placeholder="请输入公告正文，支持文字、图片…" /></Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="scope" label="范围">
              <Select options={[{ value: "all", label: "全部" }, { value: "dealer", label: "指定经销商" }]} />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select options={[{ value: "draft", label: "草稿" }, { value: "published", label: "发布" }]} />
            </Form.Item>
          </div>
          <Form.Item name="dealer_ids" label="指定经销商 ID（范围=指定经销商时填写，逗号分隔）"><Input placeholder="如：2,3,4" /></Form.Item>
        </Form>
      </Modal>

      {/* 文档表单 */}
      <Modal title={docEdit ? "编辑文档" : "新建文档"} open={docModal} onOk={handleDocOk} onCancel={() => setDocModal(false)} destroyOnClose>
        <Form form={docForm} layout="vertical">
          <Form.Item name="title" label="文档标题" rules={[{ required: true }]}><Input maxLength={200} /></Form.Item>
          <Form.Item name="file_url" label="文件 URL" rules={[{ required: true }]}><Input placeholder="/static/xxx.pdf" /></Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="file_size" label="文件大小（字节）"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="sort" label="排序"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
