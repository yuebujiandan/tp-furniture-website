import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, Modal, Table, Tag, message } from "antd";
import { getAdminConfigs, updateConfig, ConfigItem } from "../api/admin";

/**
 * 系统配置页（PRD 7.7.4 / 技术文档 §6.6.14）
 * 实现说明：配置键列表（分组）+ 编辑弹窗（JSON 值编辑）；读取接口实时生效。
 */
export default function ConfigsPage() {
  const [list, setList] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<ConfigItem | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try { setList(await getAdminConfigs()); } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /** 打开编辑弹窗（JSON 序列化展示） */
  function openEdit(row: ConfigItem) {
    setTarget(row);
    form.setFieldsValue({ value_json: JSON.stringify(row.value, null, 2) });
  }

  async function handleOk() {
    if (!target) return;
    const values = await form.validateFields();
    try {
      const parsed = JSON.parse(values.value_json); // 非法 JSON → 抛错提示
      await updateConfig(target.key, parsed);
      message.success("配置已更新，前台立即生效");
      setTarget(null);
      load();
    } catch (e) {
      message.error("JSON 格式错误：" + (e instanceof Error ? e.message : ""));
    }
  }

  const columns = [
    { title: "配置键", dataIndex: "key", width: 220, render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "分组", dataIndex: "group", width: 100, render: (v: string) => <Tag color="gold">{v}</Tag> },
    { title: "说明", dataIndex: "desc", width: 200, render: (v: string) => v || "-" },
    { title: "当前值", dataIndex: "value", ellipsis: true, render: (v: Record<string, unknown>) => <span className="text-cream-3 text-xs">{JSON.stringify(v)}</span> },
    { title: "更新时间", dataIndex: "updated_at", width: 150, render: (v: string | null) => v ? new Date(v).toLocaleString("zh-CN", { hour12: false }) : "-" },
    { title: "操作", width: 100, render: (_: unknown, r: ConfigItem) => <Button size="small" onClick={() => openEdit(r)}>编辑</Button> },
  ];

  return (
    <div>
      <h2 className="text-cream font-serif-title tracking-[2px] mb-4">系统配置</h2>
      <Table rowKey="key" dataSource={list} columns={columns} loading={loading} pagination={false} />

      {/* 编辑弹窗（JSON 编辑器） */}
      <Modal title={`编辑配置 · ${target?.key ?? ""}`} open={!!target} onOk={handleOk} onCancel={() => setTarget(null)} width={640} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="value_json" label="配置值（JSON）" rules={[{ required: true }]}>
            <Input.TextArea rows={10} className="font-mono text-xs" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
