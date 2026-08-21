import { useCallback, useEffect, useState } from "react";
import { Button, Checkbox, Form, Input, Modal, Popconfirm, Space, Table, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { createAdminRole, deleteAdminRole, getAdminRoles, getPermissionCatalog, updateAdminRole, AdminRole } from "../api/admin";

/**
 * 角色权限管理页（PRD 7.7.2 / 技术文档 §6.6.12）
 * 实现说明：角色列表（权限码摘要）+ 权限矩阵编辑弹窗（按分组勾选，附录 C-1 目录）；
 * 权限变更即时生效（后端实时读库）；超管角色禁删禁改权限。
 */
export default function RolesPage() {
  const [list, setList] = useState<AdminRole[]>([]);
  const [catalog, setCatalog] = useState<{ group: string; perms: string[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRole | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roles, cat] = await Promise.all([getAdminRoles(), getPermissionCatalog()]);
      setList(roles);
      setCatalog(cat);
    } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /** 打开角色表单（权限回填） */
  function openModal(row?: AdminRole) {
    setEditing(row ?? null);
    form.setFieldsValue(row ? { role_name: row.role_name, description: row.description, permissions: row.permissions } : { permissions: [] });
    setModalOpen(true);
  }

  async function handleOk() {
    const values = await form.validateFields();
    try {
      if (editing) { await updateAdminRole(editing.id, values); message.success("权限已更新，即时生效"); }
      else { await createAdminRole(values); message.success("已创建"); }
      setModalOpen(false);
      load();
    } catch { /* 拦截器提示 */ }
  }

  const columns = [
    { title: "角色", dataIndex: "role_name", width: 140, render: (v: string, r: AdminRole) => <span className="text-gold-soft">{r.code === "super_admin" && "★ "}{v}</span> },
    { title: "标识", dataIndex: "code", width: 130 },
    { title: "描述", dataIndex: "description", ellipsis: true, render: (v: string | null) => v || "-" },
    { title: "权限数", dataIndex: "permissions", width: 90, render: (v: string[]) => <Tag color="gold">{v?.length ?? 0} 项</Tag> },
    {
      title: "操作", width: 170, render: (_: unknown, r: AdminRole) => (
        <Space>
          <Button size="small" disabled={r.code === "super_admin"} onClick={() => openModal(r)}>编辑权限</Button>
          <Popconfirm title="确认删除该角色？" onConfirm={async () => { await deleteAdminRole(r.id); message.success("已删除"); load(); }}>
            <Button size="small" danger disabled={r.code === "super_admin"}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-cream font-serif-title tracking-[2px]">角色权限</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>新建角色</Button>
      </div>

      <Table rowKey="id" dataSource={list} columns={columns} loading={loading} pagination={false} />

      {/* 权限矩阵编辑弹窗（分组勾选，PRD 7.7.2） */}
      <Modal title={editing ? `编辑权限 · ${editing.role_name}` : "新建角色"} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} width={560} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="role_name" label="角色名称" rules={[{ required: true }]}><Input maxLength={50} /></Form.Item>
          <Form.Item name="description" label="描述"><Input maxLength={255} /></Form.Item>
          <Form.Item name="permissions" label="权限（按组勾选）" valuePropName="checked">
            <Checkbox.Group className="w-full">
              <div className="space-y-3">
                {catalog.map((g) => (
                  <div key={g.group} className="rounded-lg bg-[#0C2418] border border-[rgba(212,175,55,.28)] p-3">
                    <p className="text-xs text-gold-soft mb-2">{g.group}</p>
                    <div className="flex flex-wrap gap-3">
                      {g.perms.map((p) => (
                        <Checkbox key={p} value={p} className="text-cream-2 text-xs">{p}</Checkbox>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
