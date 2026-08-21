import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, Tabs, Tag, message } from "antd";
import { getBizFranchise, setFranchiseStatus, getBizInquiries, quoteInquiry, getBizEngineering, setEngineeringStatus } from "../api/admin";

/**
 * B 端业务管理页（PRD 7.3.2-7.3.4 / 技术文档 §6.6.9）
 * 实现说明：加盟申请 / 批量询价 / 工程定制 三个 Tab；
 * - 加盟：状态流转 contacted→negotiating→signed/rejected（驳回填写原因）；
 * - 询价：报价弹窗（总价 + 明细 JSON）；
 * - 工程：状态流转 designing→quoting→signed/closed。
 */
const PURPOSE_MAP: Record<string, string> = { self_use: "自用", project: "工程项目", wholesale: "批发" };
const PROJECT_MAP: Record<string, string> = { hotel: "酒店/民宿", office: "办公", commercial: "商业", school: "学校", other: "其他" };
const F_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "待联系", color: "warning" }, contacted: { label: "已联系", color: "blue" },
  negotiating: { label: "洽谈中", color: "processing" }, signed: { label: "已签约", color: "success" }, rejected: { label: "已驳回", color: "error" },
};
const I_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "待报价", color: "warning" }, quoted: { label: "已报价", color: "blue" },
  accepted: { label: "已接受", color: "success" }, closed: { label: "已关闭", color: "default" },
};
const E_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "待处理", color: "warning" }, designing: { label: "设计中", color: "blue" },
  quoting: { label: "报价中", color: "processing" }, signed: { label: "已签约", color: "success" }, closed: { label: "已关闭", color: "default" },
};

export default function BizManagement() {
  // 加盟
  const [fList, setFList] = useState<Awaited<ReturnType<typeof getBizFranchise>>["list"]>([]);
  const [fTotal, setFTotal] = useState(0);
  const [fPage, setFPage] = useState(1);
  // 询价
  const [iList, setIList] = useState<Awaited<ReturnType<typeof getBizInquiries>>["list"]>([]);
  const [iTotal, setITotal] = useState(0);
  const [iPage, setIPage] = useState(1);
  // 工程
  const [eList, eSetList] = useState<Awaited<ReturnType<typeof getBizEngineering>>["list"]>([]);
  const [eTotal, setETotal] = useState(0);
  const [ePage, setEPage] = useState(1);
  const [loading, setLoading] = useState(false);
  // 询价报价弹窗
  const [quoteTarget, setQuoteTarget] = useState<{ id: number; company: string } | null>(null);
  const [quoteForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, i, e] = await Promise.all([
        getBizFranchise({ page: fPage, page_size: 10 }),
        getBizInquiries({ page: iPage, page_size: 10 }),
        getBizEngineering({ page: ePage, page_size: 10 }),
      ]);
      setFList(f.list); setFTotal(f.total);
      setIList(i.list); setITotal(i.total);
      eSetList(e.list); setETotal(e.total);
    } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, [fPage, iPage, ePage]);

  useEffect(() => { load(); }, [load]);

  /** 加盟状态流转 */
  async function handleFranchise(id: number, status: string, reject_reason?: string) {
    try { await setFranchiseStatus(id, { status, reject_reason }); message.success("已更新"); load(); } catch { /* 拦截器提示 */ }
  }
  /** 工程状态流转 */
  async function handleEng(id: number, status: string) {
    try { await setEngineeringStatus(id, status); message.success("已更新"); load(); } catch { /* 拦截器提示 */ }
  }
  /** 询价报价提交 */
  async function handleQuoteOk() {
    if (!quoteTarget) return;
    const values = await quoteForm.validateFields();
    try {
      await quoteInquiry(quoteTarget.id, {
        status: "quoted",
        quote: { total: values.total, items: values.quote_items ? String(values.quote_items).split("\n").filter(Boolean) : [], valid_until: values.valid_until },
      });
      message.success("报价已提交");
      setQuoteTarget(null);
      load();
    } catch { /* 拦截器提示 */ }
  }

  // ===== 加盟表格 =====
  const fColumns = [
    { title: "姓名", dataIndex: "name", width: 90, render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "手机号", dataIndex: "phone", width: 130 },
    { title: "城市", dataIndex: "city", width: 90 },
    { title: "投资", dataIndex: "invest_amount", width: 90, render: (v: string | null) => v || "-" },
    { title: "面积", dataIndex: "area", width: 90, render: (v: string | null) => v || "-" },
    { title: "状态", dataIndex: "status", width: 90, render: (v: string) => <Tag color={F_STATUS[v]?.color}>{F_STATUS[v]?.label ?? v}</Tag> },
    {
      title: "操作", width: 260, render: (_: unknown, r: { id: number; status: string }) => (
        <Space size={4} wrap>
          {r.status === "pending" && <Button size="small" type="primary" onClick={() => handleFranchise(r.id, "contacted")}>标记联系</Button>}
          {r.status === "contacted" && <Button size="small" type="primary" onClick={() => handleFranchise(r.id, "negotiating")}>洽谈中</Button>}
          {r.status === "negotiating" && <Button size="small" type="primary" onClick={() => handleFranchise(r.id, "signed")}>签约</Button>}
          {["pending", "contacted", "negotiating"].includes(r.status) && (
            <Popconfirm title="确认驳回？" onConfirm={() => handleFranchise(r.id, "rejected", "不符合加盟条件")}>
              <Button size="small" danger>驳回</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ===== 询价表格 =====
  const iColumns = [
    { title: "公司", dataIndex: "company", width: 140, render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "联系人", dataIndex: "contact", width: 90 },
    { title: "电话", dataIndex: "phone", width: 130 },
    { title: "用途", dataIndex: "purpose", width: 80, render: (v: string) => PURPOSE_MAP[v] ?? v },
    { title: "清单", dataIndex: "items", ellipsis: true, render: (v: { name: string; qty: number }[]) => v.map((it) => `${it.name}×${it.qty}`).join("、") },
    { title: "状态", dataIndex: "status", width: 90, render: (v: string) => <Tag color={I_STATUS[v]?.color}>{I_STATUS[v]?.label ?? v}</Tag> },
    {
      title: "操作", width: 140, render: (_: unknown, r: { id: number; status: string; company: string }) => (
        r.status === "pending" ? (
          <Button size="small" type="primary" onClick={() => { setQuoteTarget({ id: r.id, company: r.company }); quoteForm.resetFields(); }}>报价</Button>
        ) : r.status === "quoted" ? (
          <Space size={4}>
            <Popconfirm title="客户确认接受报价？" onConfirm={async () => { await quoteInquiry(r.id, { status: "accepted" }); load(); }}>
              <Button size="small" type="primary">接受</Button>
            </Popconfirm>
            <Popconfirm title="关闭该询价？" onConfirm={async () => { await quoteInquiry(r.id, { status: "closed" }); load(); }}>
              <Button size="small" danger>关闭</Button>
            </Popconfirm>
          </Space>
        ) : <span>-</span>
      ),
    },
  ];

  // ===== 工程表格 =====
  const eColumns = [
    { title: "公司", dataIndex: "company", width: 140, render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "联系人", dataIndex: "contact", width: 90 },
    { title: "类型", dataIndex: "project_type", width: 100, render: (v: string) => PROJECT_MAP[v] ?? v },
    { title: "地点", dataIndex: "location", width: 110, render: (v: string | null) => v || "-" },
    { title: "规模", dataIndex: "scale", width: 110, render: (v: string | null) => v || "-" },
    { title: "状态", dataIndex: "status", width: 90, render: (v: string) => <Tag color={E_STATUS[v]?.color}>{E_STATUS[v]?.label ?? v}</Tag> },
    {
      title: "操作", width: 240, render: (_: unknown, r: { id: number; status: string }) => (
        <Space size={4} wrap>
          {r.status === "pending" && <Button size="small" type="primary" onClick={() => handleEng(r.id, "designing")}>开始设计</Button>}
          {r.status === "designing" && <Button size="small" type="primary" onClick={() => handleEng(r.id, "quoting")}>报价</Button>}
          {r.status === "quoting" && <Button size="small" type="primary" onClick={() => handleEng(r.id, "signed")}>签约</Button>}
          {["pending", "designing", "quoting"].includes(r.status) && (
            <Popconfirm title="关闭该需求？" onConfirm={() => handleEng(r.id, "closed")}>
              <Button size="small" danger>关闭</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2 className="text-cream font-serif-title tracking-[2px] mb-4">B 端业务管理</h2>
      <Tabs
        items={[
          {
            key: "franchise", label: `加盟申请`,
            children: <Table rowKey="id" dataSource={fList} columns={fColumns} loading={loading} pagination={{ current: fPage, total: fTotal, pageSize: 10, onChange: setFPage }} />,
          },
          {
            key: "inquiry", label: "批量询价",
            children: <Table rowKey="id" dataSource={iList} columns={iColumns} loading={loading} pagination={{ current: iPage, total: iTotal, pageSize: 10, onChange: setIPage }} />,
          },
          {
            key: "engineering", label: "工程定制",
            children: <Table rowKey="id" dataSource={eList} columns={eColumns} loading={loading} pagination={{ current: ePage, total: eTotal, pageSize: 10, onChange: setEPage }} />,
          },
        ]}
      />

      {/* 询价报价弹窗 */}
      <Modal title={`报价 · ${quoteTarget?.company ?? ""}`} open={!!quoteTarget} onOk={handleQuoteOk} onCancel={() => setQuoteTarget(null)} destroyOnClose>
        <Form form={quoteForm} layout="vertical">
          <Form.Item name="total" label="报价总金额" rules={[{ required: true }]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="quote_items" label="报价明细（每行一条，如：定制柜 8000元/件）"><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="valid_until" label="报价有效期"><Input placeholder="如：2026-09-30" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
