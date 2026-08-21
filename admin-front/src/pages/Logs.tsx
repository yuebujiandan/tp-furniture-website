import { useCallback, useEffect, useState } from "react";
import { Input, Select, Table, Tag } from "antd";
import { getAdminLogs, OpLog } from "../api/admin";

/**
 * 操作日志页（PRD 7.7.3 / 技术文档 §6.6.13）
 * 实现说明：日志列表（模块/关键词筛选 + 分页），中间件自动记录后台写操作。
 */
export default function LogsPage() {
  const [list, setList] = useState<OpLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ module: "", kw: "" });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminLogs({ ...filters, page, page_size: 15 });
      setList(res.list);
      setTotal(res.total);
    } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const actionColor = (a: string) => (a === "POST" ? "green" : a === "PUT" ? "blue" : a === "DELETE" ? "red" : "default");

  const columns = [
    { title: "时间", dataIndex: "created_at", width: 170, render: (v: string | null) => v ? new Date(v).toLocaleString("zh-CN", { hour12: false }) : "-" },
    { title: "操作人", dataIndex: "operator", width: 100, render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "模块", dataIndex: "module", width: 110, render: (v: string) => <Tag color="gold">{v}</Tag> },
    { title: "动作", dataIndex: "action", width: 80, render: (v: string) => <Tag color={actionColor(v)}>{v}</Tag> },
    { title: "路径", dataIndex: "target", ellipsis: true },
    { title: "IP", dataIndex: "ip", width: 130, render: (v: string | null) => v || "-" },
  ];

  return (
    <div>
      <h2 className="text-cream font-serif-title tracking-[2px] mb-4">操作日志</h2>
      <div className="flex gap-3 mb-4">
        <Select allowClear placeholder="全部模块" style={{ width: 150 }} value={filters.module || undefined}
          onChange={(v) => { setFilters({ ...filters, module: v ?? "" }); setPage(1); }}
          options={["products", "content", "messages", "appointments", "contracts", "users", "biz", "recruit", "dealer", "announcements", "roles", "staffs", "configs"].map((m) => ({ value: m, label: m }))} />
        <Input.Search placeholder="搜索动作/路径" style={{ width: 260 }} onSearch={(kw) => { setFilters({ ...filters, kw }); setPage(1); }} />
      </div>
      <Table rowKey="id" dataSource={list} columns={columns} loading={loading}
        pagination={{ current: page, total, pageSize: 15, onChange: setPage }} />
    </div>
  );
}
