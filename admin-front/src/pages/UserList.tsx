import { useCallback, useEffect, useState } from "react";
import { Button, Input, Popconfirm, Select, Table, Tag, message } from "antd";
import { getAdminUsers, setUserStatus, AdminUser } from "../api/admin";

/**
 * 用户管理页（PRD 7.5 / 技术文档 §6.6.4）
 * 实现说明：用户列表（角色/关键词/状态筛选 + 分页）+ 禁用/启用（前台登录 40301 拦截）。
 */
export default function UserListPage() {
  const [list, setList] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ role: "", kw: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminUsers({ ...filters, page, page_size: 10 });
      setList(res.list);
      setTotal(res.total);
    } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  /** 禁用/启用用户 */
  async function handleStatus(user: AdminUser) {
    try {
      await setUserStatus(user.id, !user.is_activate);
      message.success(user.is_activate ? "已禁用（该用户前台登录将失败）" : "已启用");
      load();
    } catch { /* 拦截器提示 */ }
  }

  const columns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "手机号", dataIndex: "phone", width: 130, render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "昵称", dataIndex: "nickname", width: 120, render: (v: string | null) => v || "-" },
    { title: "角色", dataIndex: "role", width: 90, render: (v: string) => v === "dealer" ? <Tag color="gold">经销商</Tag> : <Tag>用户</Tag> },
    { title: "折扣", dataIndex: "dealer_discount", width: 80, render: (v: number | null) => (v !== null ? `${Math.round(v * 100)}%` : "-") },
    { title: "状态", dataIndex: "is_activate", width: 80, render: (v: boolean) => (v ? <Tag color="success">正常</Tag> : <Tag color="error">禁用</Tag>) },
    { title: "注册时间", dataIndex: "created_at", width: 120, render: (v: string | null) => v ? new Date(v).toLocaleDateString("zh-CN") : "-" },
    {
      title: "操作", width: 100, render: (_: unknown, r: AdminUser) => (
        <Popconfirm title={r.is_activate ? "确认禁用该用户？" : "确认启用该用户？"} onConfirm={() => handleStatus(r)}>
          <Button size="small" danger={r.is_activate}>{r.is_activate ? "禁用" : "启用"}</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-cream font-serif-title tracking-[2px]">用户管理</h2>
      </div>

      <div className="flex gap-3 mb-4">
        <Select allowClear placeholder="全部角色" style={{ width: 130 }} value={filters.role || undefined}
          onChange={(v) => { setFilters({ ...filters, role: v ?? "" }); setPage(1); }}
          options={[{ value: "user", label: "用户" }, { value: "dealer", label: "经销商" }]} />
        <Input.Search placeholder="搜索手机号/昵称" style={{ width: 240 }} onSearch={(kw) => { setFilters({ ...filters, kw }); setPage(1); }} />
      </div>

      <Table rowKey="id" dataSource={list} columns={columns} loading={loading}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage }} />
    </div>
  );
}
