import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { createAdminStaff, getAdminRoles, getAdminStaffs, resetStaffPassword, updateAdminStaff, AdminRole, AdminStaff } from "../api/admin";

/**
 * 管理员管理页（PRD 7.7.1 / 技术文档 §6.6.11）
 * 实现说明：员工列表（角色筛选 + 分页）+ 新建/编辑（角色下拉/启用）+ 重置密码。
 */
export default function AdminsPage() {
  const [list, setList] = useState<AdminStaff[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminStaff | null>(null);
  const [pwdTarget, setPwdTarget] = useState<AdminStaff | null>(null);
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminStaffs({ page, page_size: 10 });
      setList(res.list);
      setTotal(res.total);
    } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); getAdminRoles().then(setRoles).catch(() => {}); }, [load]);

  /** 打开新建/编辑弹窗 */
  function openModal(row?: AdminStaff) {
    setEditing(row ?? null);
    form.setFieldsValue(row
      ? { username: row.username, name: row.name, nickname: row.nickname, phone: row.phone, email: row.email, position: row.position, role_id: row.role_id, is_activate: row.is_activate }
      : { is_activate: true });
    setModalOpen(true);
  }

  async function handleOk() {
    const values = await form.validateFields();
    try {
      if (editing) { await updateAdminStaff(editing.id, values); message.success("已更新"); }
      else {
        if (!values.password) { message.warning("请设置初始密码"); return; }
        await createAdminStaff(values); message.success("已创建");
      }
      setModalOpen(false);
      load();
    } catch { /* 拦截器提示 */ }
  }

  /** 重置密码 */
  async function handlePwdOk() {
    if (!pwdTarget) return;
    const values = await pwdForm.validateFields();
    try { await resetStaffPassword(pwdTarget.id, values.password); message.success("密码已重置"); setPwdTarget(null); } catch { /* 拦截器提示 */ }
  }

  const columns = [
    { title: "登录名", dataIndex: "username", width: 120, render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "姓名", dataIndex: "name", width: 100, render: (v: string | null) => v || "-" },
    { title: "昵称", dataIndex: "nickname", width: 100, render: (v: string | null) => v || "-" },
    { title: "手机号", dataIndex: "phone", width: 120, render: (v: string | null) => v || "-" },
    { title: "岗位", dataIndex: "position", width: 100, render: (v: string | null) => v || "-" },
    { title: "角色", dataIndex: "role_name", width: 110, render: (v: string | null, r: AdminStaff) => (r.role_code === "super_admin" ? <Tag color="gold">超级管理员</Tag> : v ?? "-") },
    { title: "状态", dataIndex: "is_activate", width: 80, render: (v: boolean) => (v ? <Tag color="success">启用</Tag> : <Tag color="error">禁用</Tag>) },
    {
      title: "操作", width: 220, render: (_: unknown, r: AdminStaff) => (
        <Space size={4}>
          <Button size="small" onClick={() => openModal(r)}>编辑</Button>
          <Button size="small" onClick={() => { setPwdTarget(r); pwdForm.resetFields(); }}>重置密码</Button>
          {r.username !== "admin" && (
            <Popconfirm title={r.is_activate ? "确认禁用该账号？" : "确认启用？"} onConfirm={async () => { await updateAdminStaff(r.id, { is_activate: !r.is_activate }); load(); }}>
              <Button size="small" danger={r.is_activate}>{r.is_activate ? "禁用" : "启用"}</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-cream font-serif-title tracking-[2px]">管理员管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新建管理员</Button>
      </div>

      <Table rowKey="id" dataSource={list} columns={columns} loading={loading}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage }} />

      {/* 新建/编辑弹窗 */}
      <Modal title={editing ? "编辑管理员" : "新建管理员"} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="username" label="登录名" rules={[{ required: true }]}><Input maxLength={50} disabled={!!editing} /></Form.Item>
            <Form.Item name="password" label={editing ? "新密码（留空不修改）" : "初始密码"} rules={!editing ? [{ required: true, min: 6 }] : []}><Input.Password /></Form.Item>
            <Form.Item name="name" label="姓名"><Input maxLength={50} /></Form.Item>
            <Form.Item name="nickname" label="昵称"><Input maxLength={50} /></Form.Item>
            <Form.Item name="phone" label="手机号"><Input maxLength={20} /></Form.Item>
            <Form.Item name="email" label="邮箱"><Input maxLength={120} /></Form.Item>
            <Form.Item name="position" label="岗位"><Input maxLength={50} /></Form.Item>
            <Form.Item name="role_id" label="角色" rules={[{ required: true }]}>
              <Select options={roles.map((r) => ({ value: r.id, label: r.role_name }))} />
            </Form.Item>
          </div>
          <Form.Item name="is_activate" label="启用" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>

      {/* 重置密码弹窗 */}
      <Modal title={`重置密码 · ${pwdTarget?.username ?? ""}`} open={!!pwdTarget} onOk={handlePwdOk} onCancel={() => setPwdTarget(null)} destroyOnClose>
        <Form form={pwdForm} layout="vertical">
          <Form.Item name="password" label="新密码" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
