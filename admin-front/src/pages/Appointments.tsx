import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, message } from "antd";
import { getAdminAppointments, setAppointmentStatus, setAppointmentNote, toContract, AdminAppointment } from "../api/admin";

/**
 * 预约管理页（PRD 7.4 / 技术文档 §6.6.5）
 * 实现说明：
 * - 筛选（状态/类型/关键词）+ 分页；
 * - 操作：确认/取消（状态机校验）、备注、转签单（V1.9 闭环弹窗，PRD 7.4.4）；
 * - 转签单后预约状态 → done 并回写 contract_id。
 */
const TYPE_MAP: Record<string, string> = { visit: "到店参观", designer: "设计师预约", measure: "上门测量", case_design: "案例同款设计" };
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "待确认", color: "warning" },
  confirmed: { label: "已确认", color: "success" },
  done: { label: "已完成", color: "default" },
  cancelled: { label: "已取消", color: "error" },
};

export default function AppointmentsPage() {
  const [list, setList] = useState<AdminAppointment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: "", type: "", kw: "" });
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTarget, setNoteTarget] = useState<AdminAppointment | null>(null);
  const [noteForm] = Form.useForm();
  const [contractOpen, setContractOpen] = useState(false);
  const [contractTarget, setContractTarget] = useState<AdminAppointment | null>(null);
  const [contractForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminAppointments({ ...filters, page, page_size: 10 });
      setList(res.list);
      setTotal(res.total);
    } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  /** 确认/取消预约 */
  async function handleStatus(id: number, status: "confirmed" | "cancelled") {
    try {
      await setAppointmentStatus(id, status);
      message.success(status === "confirmed" ? "预约已确认" : "预约已取消");
      load();
    } catch { /* 拦截器提示（状态机校验错误） */ }
  }

  /** 保存备注 */
  async function handleNoteOk() {
    if (!noteTarget) return;
    const values = await noteForm.validateFields();
    try { await setAppointmentNote(noteTarget.id, values.admin_note ?? ""); message.success("备注已保存"); setNoteOpen(false); load(); } catch { /* 拦截器提示 */ }
  }

  /** 转签单提交（V1.9 闭环，PRD 7.4.4） */
  async function handleContractOk() {
    if (!contractTarget) return;
    const values = await contractForm.validateFields();
    try {
      const res = await toContract(contractTarget.id, {
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        items: values.items_text ? String(values.items_text).split("\n").filter(Boolean).map((l: string) => {
          const [name = "", price = "0", qty = "1"] = l.split(",");
          return { name: name.trim(), product_no: "", unit_price: Number(price) || 0, qty: Number(qty) || 1 };
        }) : [],
        total_amount: values.total_amount ?? null,
        deposit: values.deposit ?? null,
        remark: values.remark,
      });
      message.success(`转签单成功：${res.contract_no}`);
      setContractOpen(false);
      load();
    } catch { /* 拦截器提示 */ }
  }

  const columns = [
    { title: "客户", dataIndex: "name", width: 90, render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "手机号", dataIndex: "phone", width: 130 },
    { title: "类型", dataIndex: "type", width: 110, render: (v: string) => TYPE_MAP[v] ?? v },
    { title: "期望时间", dataIndex: "expect_date", width: 120, render: (_: unknown, r: AdminAppointment) => `${r.expect_date}${r.expect_time ? ` ${r.expect_time}` : ""}` },
    { title: "备注", dataIndex: "remark", ellipsis: true },
    {
      title: "状态", dataIndex: "status", width: 90,
      render: (v: string) => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label ?? v}</Tag>,
    },
    {
      title: "操作", width: 260, render: (_: unknown, r: AdminAppointment) => (
        <Space size={4} wrap>
          {r.status === "pending" && <Button size="small" type="primary" onClick={() => handleStatus(r.id, "confirmed")}>确认</Button>}
          {["pending", "confirmed"].includes(r.status) && (
            <>
              <Popconfirm title="确认取消该预约？" onConfirm={() => handleStatus(r.id, "cancelled")}>
                <Button size="small" danger>取消</Button>
              </Popconfirm>
              <Button size="small" onClick={() => { setNoteTarget(r); noteForm.setFieldsValue({ admin_note: r.admin_note ?? "" }); setNoteOpen(true); }}>备注</Button>
              <Button size="small" type="primary" ghost onClick={() => { setContractTarget(r); contractForm.setFieldsValue({ customer_name: r.name, customer_phone: r.phone }); setContractOpen(true); }}>转签单</Button>
            </>
          )}
          {r.contract_id && <Tag color="gold">已转单</Tag>}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-cream font-serif-title tracking-[2px]">预约管理</h2>
      </div>

      {/* 筛选区 */}
      <div className="flex gap-3 mb-4">
        <Select allowClear placeholder="全部状态" style={{ width: 130 }} value={filters.status || undefined}
          onChange={(v) => { setFilters({ ...filters, status: v ?? "" }); setPage(1); }}
          options={[{ value: "pending", label: "待确认" }, { value: "confirmed", label: "已确认" }, { value: "done", label: "已完成" }, { value: "cancelled", label: "已取消" }]} />
        <Select allowClear placeholder="全部类型" style={{ width: 140 }} value={filters.type || undefined}
          onChange={(v) => { setFilters({ ...filters, type: v ?? "" }); setPage(1); }}
          options={Object.entries(TYPE_MAP).map(([v, l]) => ({ value: v, label: l }))} />
        <Input.Search placeholder="搜索姓名/手机号" style={{ width: 220 }} onSearch={(kw) => { setFilters({ ...filters, kw }); setPage(1); }} />
      </div>

      <Table rowKey="id" dataSource={list} columns={columns} loading={loading}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage }} />

      {/* 备注弹窗 */}
      <Modal title="预约备注" open={noteOpen} onOk={handleNoteOk} onCancel={() => setNoteOpen(false)} destroyOnClose>
        <Form form={noteForm} layout="vertical">
          <Form.Item name="admin_note" label="后台备注（客户不可见）"><Input.TextArea rows={3} maxLength={500} /></Form.Item>
        </Form>
      </Modal>

      {/* 转签单弹窗（V1.9 闭环，PRD 7.4.4） */}
      <Modal title={`转签单 · ${contractTarget?.name ?? ""}`} open={contractOpen} onOk={handleContractOk} onCancel={() => setContractOpen(false)} width={560} destroyOnClose>
        <Form form={contractForm} layout="vertical">
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="customer_name" label="客户姓名" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="customer_phone" label="客户手机号" rules={[{ required: true }]}><Input /></Form.Item>
          </div>
          <Form.Item name="items_text" label="产品清单（每行：名称,单价,数量）" extra="示例：定制柜,10000,1">
            <Input.TextArea rows={4} placeholder={"定制柜,10000,1\n餐边柜,8000,1"} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="total_amount" label="总金额"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="deposit" label="定金"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          </div>
          <Form.Item name="remark" label="备注"><Input maxLength={500} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
