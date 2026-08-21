import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, message } from "antd";
import { PlusOutlined, DownloadOutlined } from "@ant-design/icons";
import {
  createAdminContract, getAdminContract, getAdminContracts, getContractKpi,
  setContractStatus, AdminContract, ContractKpi,
} from "../api/admin";
import client from "../api/client";

/**
 * 签单管理页（PRD 7.4.5-7.4.6 / 技术文档 §6.6.6）
 * 实现说明：
 * - 6 项 KPI 卡片（总签单/总金额/本月签单/本月金额/待交付/已取消，PRD 7.6.3）；
 * - 列表筛选（状态/来源/关键词）+ 新建（线下录单）+ 详情弹窗（含流转日志）；
 * - 状态流转（signed→producing→delivered→done / →cancelled，状态机白名单）；
 * - CSV 导出（UTF-8 BOM，Excel 直接打开）。
 */
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  signed: { label: "已签单", color: "gold" },
  producing: { label: "生产中", color: "blue" },
  delivered: { label: "已交付", color: "green" },
  done: { label: "已完成", color: "default" },
  cancelled: { label: "已取消", color: "error" },
};
const SOURCE_MAP: Record<string, string> = { offline: "线下录单", appointment: "预约转签单", dealer_intent: "经销商意向" };
/** 状态机：当前状态 → 可流转状态（PRD 7.4.6） */
const NEXT_STATUS: Record<string, { status: string; label: string }[]> = {
  signed: [{ status: "producing", label: "开始生产" }, { status: "cancelled", label: "取消" }],
  producing: [{ status: "delivered", label: "交付" }, { status: "cancelled", label: "取消" }],
  delivered: [{ status: "done", label: "完成" }],
  done: [],
  cancelled: [],
};

export default function ContractsPage() {
  const [kpi, setKpi] = useState<ContractKpi | null>(null);
  const [list, setList] = useState<AdminContract[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: "", source: "", kw: "" });
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<AdminContract & { logs: { action: string; detail: Record<string, unknown> | null; created_at: string | null }[] } | null>(null);
  const [createForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminContracts({ ...filters, page, page_size: 10 });
      setList(res.list);
      setTotal(res.total);
    } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); getContractKpi().then(setKpi).catch(() => {}); }, [load]);

  /** 新建签单（线下录单） */
  async function handleCreate() {
    const values = await createForm.validateFields();
    try {
      const items = values.items_text ? String(values.items_text).split("\n").filter(Boolean).map((l: string) => {
        const [name = "", price = "0", qty = "1"] = l.split(",");
        return { name: name.trim(), product_no: "", unit_price: Number(price) || 0, qty: Number(qty) || 1 };
      }) : [];
      const res = await createAdminContract({ ...values, items });
      message.success(`签单已创建：${res.contract_no}`);
      setCreateOpen(false);
      createForm.resetFields();
      load();
    } catch { /* 拦截器提示 */ }
  }

  /** 状态流转（带日志） */
  async function handleStatus(id: number, status: string) {
    try {
      let reason: string | undefined;
      if (status === "cancelled") {
        // 简化：使用默认原因（完整取消原因表单在 P5 迭代）
        reason = "后台取消";
      }
      await setContractStatus(id, { status, cancel_reason: reason });
      message.success("状态已更新");
      load();
    } catch { /* 拦截器提示（状态机校验） */ }
  }

  /** 查看详情（含流转日志） */
  async function openDetail(id: number) {
    try { setDetail(await getAdminContract(id)); } catch { /* 拦截器提示 */ }
  }

  /** CSV 导出（经 axios 携带 Bearer token 下载，技术文档 §6.6.6） */
  async function handleExport() {
    try {
      const res = await client.get("/admin/contracts/export", { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "contracts.csv";
      a.click();
      URL.revokeObjectURL(url);
      message.success("导出成功");
    } catch {
      message.error("导出失败");
    }
  }

  const kpiCards = kpi ? [
    { label: "总签单", value: kpi.total_contracts, unit: "单" },
    { label: "总金额", value: kpi.total_amount.toLocaleString("zh-CN"), unit: "元" },
    { label: "本月签单", value: kpi.month_contracts, unit: "单" },
    { label: "本月金额", value: kpi.month_amount.toLocaleString("zh-CN"), unit: "元" },
    { label: "待交付", value: kpi.pending_delivery, unit: "单" },
    { label: "已取消", value: kpi.cancelled, unit: "单" },
  ] : [];

  const columns = [
    { title: "签单号", dataIndex: "contract_no", width: 150, render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "客户", dataIndex: "customer_name", width: 100 },
    { title: "手机号", dataIndex: "customer_phone", width: 130 },
    { title: "来源", dataIndex: "source", width: 100, render: (v: string) => SOURCE_MAP[v] ?? v },
    { title: "总金额", dataIndex: "total_amount", width: 110, render: (v: number | null) => v !== null ? `¥${v.toLocaleString("zh-CN")}` : "待定" },
    { title: "状态", dataIndex: "status", width: 90, render: (v: string) => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label ?? v}</Tag> },
    {
      title: "操作", width: 250, render: (_: unknown, r: AdminContract) => (
        <Space size={4} wrap>
          <Button size="small" onClick={() => openDetail(r.id)}>详情</Button>
          {NEXT_STATUS[r.status]?.map((n) => (
            <Popconfirm key={n.status} title={`确认${n.label}？`} onConfirm={() => handleStatus(r.id, n.status)}>
              <Button size="small" type={n.status === "cancelled" ? "default" : "primary"} danger={n.status === "cancelled"}>{n.label}</Button>
            </Popconfirm>
          ))}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-cream font-serif-title tracking-[2px]">签单管理</h2>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>导出 CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建签单</Button>
        </Space>
      </div>

      {/* 6 项 KPI 卡片（PRD 7.6.3） */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {kpiCards.map((k) => (
          <div key={k.label} className="p-5 rounded-[18px] bg-forest-2 border border-line-gold">
            <p className="text-xs text-cream-3 mb-2">{k.label}</p>
            <p className="text-xl font-serif-title text-gold-gradient truncate">{k.value}<span className="text-xs text-cream-3 ml-1">{k.unit}</span></p>
          </div>
        ))}
      </div>

      {/* 筛选区 */}
      <div className="flex gap-3 mb-4">
        <Select allowClear placeholder="全部状态" style={{ width: 130 }} value={filters.status || undefined}
          onChange={(v) => { setFilters({ ...filters, status: v ?? "" }); setPage(1); }}
          options={Object.entries(STATUS_MAP).map(([v, s]) => ({ value: v, label: s.label }))} />
        <Select allowClear placeholder="全部来源" style={{ width: 140 }} value={filters.source || undefined}
          onChange={(v) => { setFilters({ ...filters, source: v ?? "" }); setPage(1); }}
          options={Object.entries(SOURCE_MAP).map(([v, l]) => ({ value: v, label: l }))} />
        <Input.Search placeholder="搜索签单号/客户/手机号" style={{ width: 240 }} onSearch={(kw) => { setFilters({ ...filters, kw }); setPage(1); }} />
      </div>

      <Table rowKey="id" dataSource={list} columns={columns} loading={loading}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage }} />

      {/* 新建签单弹窗（线下录单） */}
      <Modal title="新建签单（线下录单）" open={createOpen} onOk={handleCreate} onCancel={() => setCreateOpen(false)} width={560} destroyOnClose>
        <Form form={createForm} layout="vertical">
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="customer_name" label="客户姓名" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="customer_phone" label="客户手机号" rules={[{ required: true }]}><Input /></Form.Item>
          </div>
          <Form.Item name="items_text" label="产品清单（每行：名称,单价,数量）">
            <Input.TextArea rows={4} placeholder={"定制柜,10000,1\n餐边柜,8000,1"} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="total_amount" label="总金额"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="deposit" label="定金"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="delivery_date" label="交付日期"><Input placeholder="YYYY-MM-DD" /></Form.Item>
            <Form.Item name="remark" label="备注"><Input maxLength={500} /></Form.Item>
          </div>
        </Form>
      </Modal>

      {/* 详情弹窗（含流转日志） */}
      <Modal title={`签单详情 · ${detail?.contract_no ?? ""}`} open={!!detail} onCancel={() => setDetail(null)} footer={null} width={600}>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-cream-3">{SOURCE_MAP[detail.source] ?? detail.source}</span>
              <Tag color={STATUS_MAP[detail.status]?.color}>{STATUS_MAP[detail.status]?.label}</Tag>
            </div>
            <div className="rounded-[14px] bg-[#0C2418] border border-[rgba(212,175,55,.28)] p-4">
              <p className="text-xs text-cream-3 mb-2">产品清单</p>
              {detail.items.map((it, i) => (
                <div key={i} className="flex justify-between py-1">
                  <span className="text-cream-2">{it.name} × {it.qty}</span>
                  <span className="text-gold-soft">¥{(it.unit_price * it.qty).toLocaleString("zh-CN")}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 mt-2 border-t border-[rgba(212,175,55,.28)]">
                <span className="text-cream">总金额</span>
                <span className="text-gold-gradient font-serif-title">{detail.total_amount !== null ? `¥${detail.total_amount.toLocaleString("zh-CN")}` : "待定"}</span>
              </div>
              {(detail.deposit !== null && detail.deposit !== undefined) && <p className="text-xs text-cream-3 mt-2">定金：¥{detail.deposit.toLocaleString("zh-CN")}</p>}
              {detail.delivery_date && <p className="text-xs text-cream-3 mt-1">交付日期：{detail.delivery_date}</p>}
              {detail.cancel_reason && <p className="text-xs text-coral mt-1">取消原因：{detail.cancel_reason}</p>}
            </div>
            {detail.logs.length > 0 && (
              <div className="rounded-[14px] bg-[#0C2418] border border-[rgba(212,175,55,.28)] p-4">
                <p className="text-xs text-cream-3 mb-2">流转日志</p>
                {detail.logs.map((l, i) => (
                  <p key={i} className="text-xs text-cream-3 py-0.5">
                    {l.created_at ? new Date(l.created_at).toLocaleString("zh-CN", { hour12: false }) : ""} · {l.action}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
