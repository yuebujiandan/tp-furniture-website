import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { createAdminJob, deleteAdminJob, getAdminJobs, getAdminJob, getAdminResumes, setResumeStatus, updateAdminJob, AdminResume } from "../api/admin";

/**
 * 招聘管理页（PRD 7.3.5 / 技术文档 §6.6.10）
 * 实现说明：岗位 Tab（CRUD：发布/下线）+ 简历 Tab（筛选 + 状态流转 submitted→screened→interviewing→hired/rejected）。
 */
const JOB_TYPE = ["社会", "校园"];
const R_STATUS: Record<string, { label: string; color: string }> = {
  submitted: { label: "已投递", color: "warning" }, screened: { label: "筛选中", color: "blue" },
  interviewing: { label: "面试中", color: "processing" }, hired: { label: "已录用", color: "success" }, rejected: { label: "未通过", color: "error" },
};

export default function RecruitManage() {
  const [jobs, setJobs] = useState<Awaited<ReturnType<typeof getAdminJobs>>["list"]>([]);
  const [jTotal, setJTotal] = useState(0);
  const [jPage, setJPage] = useState(1);
  const [resumes, setResumes] = useState<AdminResume[]>([]);
  const [rTotal, setRTotal] = useState(0);
  const [rPage, setRPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [jobForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [j, r] = await Promise.all([getAdminJobs({ page: jPage, page_size: 10 }), getAdminResumes({ page: rPage, page_size: 10 })]);
      setJobs(j.list); setJTotal(j.total);
      setResumes(r.list); setRTotal(r.total);
    } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, [jPage, rPage]);

  useEffect(() => { load(); }, [load]);

  /** 打开岗位表单（编辑回填） */
  async function openForm(id?: number) {
    setEditingId(id ?? null);
    if (id) {
      const j = await getAdminJob(id);
      jobForm.setFieldsValue({ title: j.title, department: j.department, location: j.location, type: j.type, salary: j.salary, tags: j.tags, duty: j.duty, requirement: j.requirement, status: j.status });
    } else {
      jobForm.resetFields();
      jobForm.setFieldsValue({ type: "社会", status: "active" });
    }
    setModalOpen(true);
  }

  async function handleOk() {
    const values = await jobForm.validateFields();
    try {
      if (editingId) { await updateAdminJob(editingId, values); message.success("已更新"); }
      else { await createAdminJob(values); message.success("已创建"); }
      setModalOpen(false);
      load();
    } catch { /* 拦截器提示 */ }
  }

  async function handleDelete(id: number) {
    try { const res = await deleteAdminJob(id); message.success(res.deleted ? "已删除" : "存在简历，已下线"); load(); } catch { /* 拦截器提示 */ }
  }

  const jColumns = [
    { title: "职位", dataIndex: "title", render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "部门", dataIndex: "department", width: 110 },
    { title: "地点", dataIndex: "location", width: 100 },
    { title: "类型", dataIndex: "type", width: 80, render: (v: string) => <Tag>{v}</Tag> },
    { title: "薪资", dataIndex: "salary", width: 100, render: (v: string | null) => v || "-" },
    { title: "状态", dataIndex: "status", width: 80, render: (v: string) => (v === "active" ? <Tag color="success">招聘中</Tag> : <Tag color="default">已下线</Tag>) },
    {
      title: "操作", width: 170, render: (_: unknown, r: { id: number }) => (
        <Space>
          <Button size="small" onClick={() => openForm(r.id)}>编辑</Button>
          <Popconfirm title="确认删除该岗位？" onConfirm={() => handleDelete(r.id)}><Button size="small" danger>删除</Button></Popconfirm>
        </Space>
      ),
    },
  ];

  const rColumns = [
    { title: "姓名", dataIndex: "name", width: 90, render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "手机号", dataIndex: "phone", width: 130 },
    { title: "岗位", dataIndex: "job_title", width: 140 },
    { title: "学历", dataIndex: "education", width: 80, render: (v: string | null) => v || "-" },
    { title: "院校", dataIndex: "school", width: 130, render: (v: string | null) => v || "-" },
    { title: "查询号", dataIndex: "apply_no", width: 100 },
    { title: "状态", dataIndex: "status", width: 90, render: (v: string) => <Tag color={R_STATUS[v]?.color}>{R_STATUS[v]?.label ?? v}</Tag> },
    {
      title: "操作", width: 240, render: (_: unknown, r: AdminResume) => (
        <Space size={4} wrap>
          {r.status === "submitted" && <Button size="small" type="primary" onClick={async () => { await setResumeStatus(r.id, "screened"); load(); }}>筛选</Button>}
          {r.status === "screened" && <Button size="small" type="primary" onClick={async () => { await setResumeStatus(r.id, "interviewing"); load(); }}>面试</Button>}
          {r.status === "interviewing" && <Button size="small" type="primary" onClick={async () => { await setResumeStatus(r.id, "hired"); load(); }}>录用</Button>}
          {["submitted", "screened", "interviewing"].includes(r.status) && (
            <Popconfirm title="标记为未通过？" onConfirm={async () => { await setResumeStatus(r.id, "rejected"); load(); }}>
              <Button size="small" danger>未通过</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-cream font-serif-title tracking-[2px]">招聘管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>新建岗位</Button>
      </div>
      <Tabs
        items={[
          { key: "jobs", label: "岗位管理", children: <Table rowKey="id" dataSource={jobs} columns={jColumns} loading={loading} pagination={{ current: jPage, total: jTotal, pageSize: 10, onChange: setJPage }} /> },
          { key: "resumes", label: "简历管理", children: <Table rowKey="id" dataSource={resumes} columns={rColumns} loading={loading} pagination={{ current: rPage, total: rTotal, pageSize: 10, onChange: setRPage }} /> },
        ]}
      />

      {/* 岗位表单 */}
      <Modal title={editingId ? "编辑岗位" : "新建岗位"} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} width={640} destroyOnClose>
        <Form form={jobForm} layout="vertical">
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="title" label="职位" rules={[{ required: true }]}><Input maxLength={100} /></Form.Item>
            <Form.Item name="type" label="类型"><Select options={JOB_TYPE.map((t) => ({ value: t, label: t }))} /></Form.Item>
            <Form.Item name="department" label="部门"><Input maxLength={50} /></Form.Item>
            <Form.Item name="location" label="地点"><Input maxLength={50} /></Form.Item>
            <Form.Item name="salary" label="薪资"><Input placeholder="如：10-15K" /></Form.Item>
            <Form.Item name="tags" label="标签"><Input placeholder="如：设计师,全屋定制" /></Form.Item>
          </div>
          <Form.Item name="duty" label="岗位职责"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="requirement" label="任职要求"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="status" label="状态"><Select options={[{ value: "active", label: "招聘中" }, { value: "closed", label: "已下线" }]} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
