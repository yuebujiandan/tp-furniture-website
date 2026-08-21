import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, Modal, Select, Table, Tag, message } from "antd";
import { getAdminMessages, handleMessage, MessageItem } from "../api/admin";

/**
 * 留言管理页（PRD 7.3.1 V1.8 / 技术文档 §6.6.4）
 * 实现说明：
 * - 列表：type+source 双字段筛选（contact_page 前台来源行金色高亮 + 「前台」徽标）+ 分页；
 * - 处理弹窗：填写回复并置为已处理（handled_at 记录）。
 */
export default function MessagesPage() {
  const [list, setList] = useState<MessageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ type: "", source: "", status: "", kw: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState<MessageItem | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminMessages({ ...filters, page, page_size: 10 });
      setList(res.list);
      setTotal(res.total);
    } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  /** 打开处理弹窗（回填已有回复） */
  function openHandle(row: MessageItem) {
    setCurrent(row);
    form.setFieldsValue({ reply: row.reply ?? "" });
    setModalOpen(true);
  }

  async function handleOk() {
    if (!current) return;
    const values = await form.validateFields();
    try {
      await handleMessage(current.id, values);
      message.success("已处理");
      setModalOpen(false);
      load();
    } catch { /* 拦截器提示 */ }
  }

  const columns = [
    { title: "姓名", dataIndex: "name", width: 90, render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "手机号", dataIndex: "phone", width: 130 },
    { title: "类型", dataIndex: "type", width: 80, render: (v: string) => v === "consult" ? <Tag color="blue">在线咨询</Tag> : <Tag>留言</Tag> },
    {
      title: "来源", dataIndex: "source", width: 100,
      render: (v: string) => v === "float_window" ? <Tag color="gold">浮窗</Tag> : <Tag color="green">联系页</Tag>,
    },
    { title: "内容", dataIndex: "content", ellipsis: true },
    { title: "状态", dataIndex: "status", width: 90, render: (v: string) => (v === "handled" ? <Tag color="success">已处理</Tag> : <Tag color="warning">待处理</Tag>) },
    { title: "时间", dataIndex: "created_at", width: 120, render: (v: string | null) => v ? new Date(v).toLocaleString("zh-CN", { hour12: false }) : "-" },
    {
      title: "操作", width: 90,
      // 前台来源行金色 7% 底 + 「前台」徽标（PRD 7.3.2 V1.8 / 技术文档 §8.3 DataTable）
      onCell: (r: MessageItem) => (r.source === "contact_page" ? { style: { background: "rgba(212,175,55,.07)" } } : {}),
      render: (_: unknown, r: MessageItem) => (
        <Button size="small" type={r.status === "pending" ? "primary" : "default"} onClick={() => openHandle(r)}>
          {r.status === "pending" ? "处理" : "查看"}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-cream font-serif-title tracking-[2px]">
          留言咨询
          {/* 「前台」金色徽标说明（PRD 7.3.2 V1.8：前台来源行金色高亮） */}
          <span className="ml-2 px-2 py-0.5 rounded-full bg-gold/15 border border-gold text-gold-soft text-[10px]">前台来源行金色高亮</span>
        </h2>
      </div>

      {/* 双字段筛选（type+source，技术文档 §1.3 校准） */}
      <div className="flex gap-3 mb-4">
        <Select
          allowClear placeholder="全部类型" style={{ width: 130 }}
          value={filters.type || undefined} onChange={(v) => { setFilters({ ...filters, type: v ?? "" }); setPage(1); }}
          options={[{ value: "message", label: "留言" }, { value: "consult", label: "在线咨询" }]}
        />
        <Select
          allowClear placeholder="全部来源" style={{ width: 130 }}
          value={filters.source || undefined} onChange={(v) => { setFilters({ ...filters, source: v ?? "" }); setPage(1); }}
          options={[{ value: "contact_page", label: "联系页" }, { value: "float_window", label: "浮窗" }]}
        />
        <Select
          allowClear placeholder="全部状态" style={{ width: 130 }}
          value={filters.status || undefined} onChange={(v) => { setFilters({ ...filters, status: v ?? "" }); setPage(1); }}
          options={[{ value: "pending", label: "待处理" }, { value: "handled", label: "已处理" }]}
        />
        <Input.Search placeholder="搜索姓名/手机号/内容" style={{ width: 240 }} onSearch={(kw) => { setFilters({ ...filters, kw }); setPage(1); }} />
      </div>

      <Table
        rowKey="id" dataSource={list} columns={columns} loading={loading}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage }}
      />

      {/* 处理弹窗 */}
      <Modal title={`处理留言 · ${current?.name ?? ""}`} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} destroyOnClose>
        {/* 原始留言内容展示 */}
        {current && (
          <div className="mb-4 p-4 rounded-lg bg-[#0C2418] border border-[rgba(212,175,55,.28)]">
            <p className="text-xs text-cream-3 mb-2">原始留言</p>
            <p className="text-sm text-cream-2">{current.content}</p>
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item name="reply" label="回复内容" rules={[{ required: true, message: "请输入回复" }]}>
            <Input.TextArea rows={4} maxLength={2000} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
