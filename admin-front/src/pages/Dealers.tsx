import { useCallback, useEffect, useState } from "react";
import { Button, Form, InputNumber, Modal, Popconfirm, Space, Table, Tag, message } from "antd";
import { getDealerApplications, reviewDealer } from "../api/admin";

/**
 * 经销商审核页（PRD 6.9.5 V1.3 / 技术文档 §6.6.9）
 * 实现说明：认证申请列表（待审核优先）+ 审核弹窗（通过：设置默认折扣率 → 用户升级 dealer 角色；驳回：填写原因）。
 */
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "待审核", color: "warning" },
  approved: { label: "已通过", color: "success" },
  rejected: { label: "已驳回", color: "error" },
};

export default function DealersPage() {
  const [list, setList] = useState<Awaited<ReturnType<typeof getDealerApplications>>["list"]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [target, setTarget] = useState<{ id: number; company_name: string } | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDealerApplications({ page, page_size: 10 });
      setList(res.list);
      setTotal(res.total);
    } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  /** 通过审核（升级 dealer 角色 + 折扣率） */
  async function handleApprove() {
    if (!target) return;
    const values = await form.validateFields();
    try {
      const res = await reviewDealer(target.id, { action: "approved", dealer_discount: values.dealer_discount });
      message.success(`已通过，用户升级为经销商（${res.user_role}）`);
      setModalOpen(false);
      load();
    } catch { /* 拦截器提示 */ }
  }

  const columns = [
    { title: "企业名称", dataIndex: "company_name", width: 180, render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "申请人", dataIndex: "contact", width: 90 },
    { title: "电话", dataIndex: "phone", width: 130 },
    { title: "信用代码", dataIndex: "credit_code", width: 150 },
    { title: "地区", dataIndex: "region", width: 90, render: (v: string | null) => v || "-" },
    { title: "状态", dataIndex: "status", width: 90, render: (v: string) => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label ?? v}</Tag> },
    {
      title: "操作", width: 200, render: (_: unknown, r: { id: number; status: string; company_name: string }) => (
        r.status === "pending" ? (
          <Space>
            <Button size="small" type="primary" onClick={() => { setTarget(r); form.setFieldsValue({ dealer_discount: 0.85 }); setModalOpen(true); }}>通过</Button>
            <Popconfirm title="确认驳回该申请？" onConfirm={async () => { await reviewDealer(r.id, { action: "rejected", reject_reason: "资料不完整" }); message.success("已驳回"); load(); }}>
              <Button size="small" danger>驳回</Button>
            </Popconfirm>
          </Space>
        ) : <span>-</span>
      ),
    },
  ];

  return (
    <div>
      <h2 className="text-cream font-serif-title tracking-[2px] mb-4">经销商审核</h2>
      <Table rowKey="id" dataSource={list} columns={columns} loading={loading}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage }} />

      {/* 审核通过弹窗：设置默认折扣率（PRD 6.9.5 V1.3） */}
      <Modal title={`审核通过 · ${target?.company_name ?? ""}`} open={modalOpen} onOk={handleApprove} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical" initialValues={{ dealer_discount: 0.85 }}>
          <Form.Item name="dealer_discount" label="默认折扣率（0-1，如 0.85 = 8.5 折）" rules={[{ required: true }]}>
            <InputNumber min={0} max={1} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
          <p className="text-xs text-cream-3">通过后该用户将获得经销商身份，可访问经销商门户专属价格与采购功能。</p>
        </Form>
      </Modal>
    </div>
  );
}
