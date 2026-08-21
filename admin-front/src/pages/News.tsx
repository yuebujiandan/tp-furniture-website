import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Upload, message } from "antd";
import type { UploadFile } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { createAdminNews, deleteAdminNews, getAdminNews, getAdminNewsDetail, updateAdminNews, NewsItem } from "../api/admin";
import { fileUrl, imageUploadRequest } from "../lib/upload";
import RichTextEditor from "../components/RichTextEditor";

/**
 * 新闻管理页（PRD 7.2.1 / 技术文档 §6.6.3）
 * 实现说明：列表（分类/发布态/关键词筛选 + 置顶优先）+ 新建/编辑（草稿/发布/下线 + 置顶 + 过期时间）
 * + 删除；富文本编辑 P2 档用 TextArea 存 HTML（wangEditor 在后续迭代替换）。
 */
export default function NewsPage() {
  const [list, setList] = useState<NewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ category: "", is_published: undefined as boolean | undefined, kw: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  // 封面图（单图）：上传走 /admin/upload，成功后 URL 由 fileUrl() 提取写入提交（与产品图更换相同方式）
  const [coverFiles, setCoverFiles] = useState<UploadFile[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminNews({ ...filters, page, page_size: 10 });
      setList(res.list);
      setTotal(res.total);
    } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  /** 打开新闻表单（编辑时回填） */
  async function openForm(id?: number) {
    setEditingId(id ?? null);
    if (id) {
      const n = await getAdminNewsDetail(id);
      form.setFieldsValue({ title: n.title, category: n.category, summary: n.summary, content_html: n.content_html, is_published: n.is_published, is_top: n.is_top, author: n.author });
      // 回填封面（URL 转 UploadFile）
      setCoverFiles(n.cover ? [{ uid: "-cover", name: "封面", status: "done", url: n.cover }] : []);
    } else {
      form.resetFields();
      form.setFieldsValue({ category: "company_news", is_published: false, is_top: false });
      setCoverFiles([]);
    }
    setModalOpen(true);
  }

  async function handleOk() {
    const values = await form.validateFields();
    // 封面图 URL 写回提交（数据库 cover 字段，字符串 URL）
    const payload = { ...values, cover: fileUrl(coverFiles[0]) ?? null };
    try {
      if (editingId) { await updateAdminNews(editingId, payload); message.success("已更新"); }
      else { await createAdminNews(payload); message.success("已创建"); }
      setModalOpen(false);
      load();
    } catch { /* 拦截器提示 */ }
  }

  async function handleDelete(id: number) {
    try { await deleteAdminNews(id); message.success("已删除"); load(); } catch { /* 拦截器提示 */ }
  }

  const columns = [
    { title: "封面", dataIndex: "cover", width: 70, render: (v: string | null) => v ? <img src={v} alt="" className="w-12 h-9 rounded object-cover" /> : "-" },
    { title: "标题", dataIndex: "title", render: (v: string, r: NewsItem) => <span className="text-gold-soft">{r.is_top && "📌 "}{v}</span> },
    { title: "分类", dataIndex: "category", width: 110, render: (v: string) => v === "company_news" ? <Tag color="gold">企业新闻</Tag> : <Tag>行业资讯</Tag> },
    { title: "发布", dataIndex: "is_published", width: 80, render: (v: boolean) => (v ? <Tag color="success">已发布</Tag> : <Tag color="warning">草稿</Tag>) },
    { title: "阅读", dataIndex: "view_count", width: 70 },
    { title: "发布时间", dataIndex: "publish_time", width: 120, render: (v: string | null) => v ? new Date(v).toLocaleDateString("zh-CN") : "-" },
    {
      title: "操作", width: 160, render: (_: unknown, r: NewsItem) => (
        <Space>
          <Button size="small" onClick={() => openForm(r.id)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-cream font-serif-title tracking-[2px]">新闻管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>新建新闻</Button>
      </div>

      {/* 筛选区 */}
      <div className="flex gap-3 mb-4">
        <Select
          allowClear placeholder="全部分类" style={{ width: 150 }}
          value={filters.category || undefined}
          onChange={(v) => { setFilters({ ...filters, category: v ?? "" }); setPage(1); }}
          options={[{ value: "company_news", label: "企业新闻" }, { value: "industry_news", label: "行业资讯" }]}
        />
        <Select
          allowClear placeholder="全部状态" style={{ width: 130 }}
          value={filters.is_published}
          onChange={(v) => { setFilters({ ...filters, is_published: v }); setPage(1); }}
          options={[{ value: true, label: "已发布" }, { value: false, label: "草稿" }]}
        />
        <Input.Search placeholder="搜索标题" style={{ width: 220 }} onSearch={(kw) => { setFilters({ ...filters, kw }); setPage(1); }} />
      </div>

      <Table rowKey="id" dataSource={list} columns={columns} loading={loading}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage }} />

      {/* 新建/编辑弹窗 */}
      <Modal title={editingId ? "编辑新闻" : "新建新闻"} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} width={720} destroyOnClose>
        <Form form={form} layout="vertical">
          {/* ---- 封面图（单图，上传走 /admin/upload，与产品图更换相同方式）---- */}
          <Form.Item label="封面图（建议 16:9 / 4:3）">
            <Upload
              listType="picture-card"
              maxCount={1}
              accept="image/*"
              fileList={coverFiles}
              customRequest={imageUploadRequest}
              onChange={({ fileList }) => setCoverFiles(fileList)}
              onRemove={() => setCoverFiles([])}
            >
              {coverFiles.length === 0 && (
                <div>
                  <PlusOutlined />
                  <div className="text-xs mt-1">上传封面</div>
                </div>
              )}
            </Upload>
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input maxLength={200} /></Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="category" label="分类">
              <Select options={[{ value: "company_news", label: "企业新闻" }, { value: "industry_news", label: "行业资讯" }]} />
            </Form.Item>
            <Form.Item name="author" label="作者"><Input maxLength={50} /></Form.Item>
          </div>
          <Form.Item name="summary" label="摘要"><Input.TextArea rows={2} maxLength={500} /></Form.Item>
          <Form.Item name="content_html" label="正文（富文本，支持图文/表格）" rules={[{ required: true }]}>
            <RichTextEditor placeholder="请输入新闻正文，支持文字、图片、表格…" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="is_published" label="发布" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="is_top" label="置顶" valuePropName="checked"><Switch /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
