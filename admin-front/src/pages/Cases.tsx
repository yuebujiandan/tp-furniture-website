import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Upload, message } from "antd";
import type { UploadFile } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { createAdminCase, deleteAdminCase, getAdminCases, getAdminCase, updateAdminCase, CaseItem } from "../api/admin";
import { fileUrl, imageUploadRequest } from "../lib/upload";
import RichTextEditor from "../components/RichTextEditor";

/**
 * 案例管理页（PRD 7.2.1）
 * 实现说明：案例列表（工程案例标记/关键词）+ 新建/编辑（含关联产品 ID 数组、客户评价、工程案例标记）。
 */
export default function CasesPage() {
  const [list, setList] = useState<CaseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ is_engineering: undefined as boolean | undefined, kw: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  // 封面图（单图）：上传走 /admin/upload，成功后 URL 由 fileUrl() 提取写入提交（与产品图更换相同方式）
  const [coverFiles, setCoverFiles] = useState<UploadFile[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminCases({ ...filters, page, page_size: 10 });
      setList(res.list);
      setTotal(res.total);
    } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  async function openForm(id?: number) {
    setEditingId(id ?? null);
    if (id) {
      const c = await getAdminCase(id);
      form.setFieldsValue({
        title: c.title, area: c.area, house_type: c.house_type, style_tags: c.style_tags, space: c.space,
        location_desc: c.location_desc, content_html: c.content_html, product_ids: (c.product_ids || []).join(","),
        is_engineering: c.is_engineering, customer_review: c.customer_review, sort: c.sort, is_activate: c.is_activate,
      });
      // 回填封面（URL 转 UploadFile）
      setCoverFiles(c.cover ? [{ uid: "-cover", name: "封面", status: "done", url: c.cover }] : []);
    } else {
      form.resetFields();
      form.setFieldsValue({ is_engineering: false, is_activate: true, sort: 0 });
      setCoverFiles([]);
    }
    setModalOpen(true);
  }

  async function handleOk() {
    const values = await form.validateFields();
    try {
      // 逗号分隔的产品 ID 转数组；封面图 URL 写回提交（数据库 cover 字段）
      const payload = { ...values, product_ids: values.product_ids ? String(values.product_ids).split(",").map(Number).filter(Boolean) : [], cover: fileUrl(coverFiles[0]) ?? null };
      if (editingId) { await updateAdminCase(editingId, payload); message.success("已更新"); }
      else { await createAdminCase(payload); message.success("已创建"); }
      setModalOpen(false);
      load();
    } catch { /* 拦截器提示 */ }
  }

  async function handleDelete(id: number) {
    try { await deleteAdminCase(id); message.success("已删除"); load(); } catch { /* 拦截器提示 */ }
  }

  const columns = [
    { title: "封面", dataIndex: "cover", width: 70, render: (v: string | null) => v ? <img src={v} alt="" className="w-12 h-9 rounded object-cover" /> : "-" },
    { title: "标题", dataIndex: "title", render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "地点", dataIndex: "location_desc", width: 130, ellipsis: true },
    { title: "面积", dataIndex: "area", width: 80 },
    { title: "类型", dataIndex: "is_engineering", width: 90, render: (v: boolean) => v ? <Tag color="gold">工程案例</Tag> : <Tag>住宅案例</Tag> },
    { title: "状态", dataIndex: "is_activate", width: 80, render: (v: boolean) => (v ? <Tag color="success">启用</Tag> : <Tag color="error">禁用</Tag>) },
    {
      title: "操作", width: 160, render: (_: unknown, r: CaseItem) => (
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
        <h2 className="text-cream font-serif-title tracking-[2px]">案例管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>新建案例</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Select
          allowClear placeholder="全部类型" style={{ width: 140 }}
          value={filters.is_engineering}
          onChange={(v) => { setFilters({ ...filters, is_engineering: v }); setPage(1); }}
          options={[{ value: true, label: "工程案例" }, { value: false, label: "住宅案例" }]}
        />
        <Input.Search placeholder="搜索标题" style={{ width: 220 }} onSearch={(kw) => { setFilters({ ...filters, kw }); setPage(1); }} />
      </div>

      <Table rowKey="id" dataSource={list} columns={columns} loading={loading}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage }} />

      <Modal title={editingId ? "编辑案例" : "新建案例"} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} width={720} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="案例标题" rules={[{ required: true }]}><Input maxLength={200} /></Form.Item>
          {/* ---- 封面图（单图，上传走 /admin/upload，与产品图更换相同方式）---- */}
          <Form.Item label="封面图（建议 4:3）">
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
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="location_desc" label="脱敏描述"><Input placeholder="如：广州 · 130㎡ 三居室" /></Form.Item>
            <Form.Item name="area" label="面积"><Input placeholder="如：130㎡" /></Form.Item>
            <Form.Item name="house_type" label="户型"><Input placeholder="如：三居室" /></Form.Item>
            <Form.Item name="style_tags" label="风格"><Input placeholder="如：新中式" /></Form.Item>
            <Form.Item name="space" label="空间"><Input placeholder="如：客厅" /></Form.Item>
          </div>
          <Form.Item name="content_html" label="图文正文（富文本，支持图文/表格）" rules={[{ required: true }]}>
            <RichTextEditor placeholder="请输入案例图文正文，支持文字、图片、表格…" />
          </Form.Item>
          <Form.Item name="product_ids" label="关联产品 ID（逗号分隔）"><Input placeholder="如：1,2,3" /></Form.Item>
          <Form.Item name="customer_review" label="客户评价"><Input.TextArea rows={2} /></Form.Item>
          <div className="grid grid-cols-3 gap-x-4">
            <Form.Item name="is_engineering" label="工程案例" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="is_activate" label="启用" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="sort" label="排序"><Input type="number" /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
