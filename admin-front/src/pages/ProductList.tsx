import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tabs, Tag, Upload, message } from "antd";
import type { UploadFile } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  AdminProduct, batchPrice, createAdminProduct, deleteAdminProduct, getAdminProducts,
  getAdminProduct, getAdminSeries, getAdminSpaces, getLowStock, updateAdminProduct,
  SeriesItem, SpaceItem,
} from "../api/admin";
import { fileUrl, imageUploadRequest } from "../lib/upload";
import RichTextEditor from "../components/RichTextEditor";

/**
 * 产品管理页（PRD 7.1.1 / 技术文档 §6.6.2）
 * 实现说明：
 * - 列表：系列/状态/关键词筛选 + 库存预警标记（stock ≤ stock_warn 红色 Tag）+ 分页；
 * - 产品表单：基本信息/价格/库存/上下架（Modal 编辑，字段对齐数据库设计 §4.4.3）；
 * - 软删除（is_deleted=True，PRD 7.1.2）；批量调价弹窗（scope × mode，PRD 7.1.1 P1）；
 * - 库存预警 Tab（stock ≤ stock_warn 列表）。
 */
export default function ProductManage() {
  const [list, setList] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ series_id: undefined as number | undefined, publish_status: "", kw: "" });
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);
  const [form] = Form.useForm();
  const [priceForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState("all");
  // 图片管理状态：封面（单图）/ 图集（多图），上传成功后将 URL 写入表单提交（P6 补齐：后台可更换产品图片）
  const [coverFiles, setCoverFiles] = useState<UploadFile[]>([]);
  const [galleryFiles, setGalleryFiles] = useState<UploadFile[]>([]);

  /** 加载产品列表（当前筛选 + 分页） */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "low") {
        const rows = await getLowStock();
        setList(rows as unknown as AdminProduct[]);
        setTotal(rows.length);
      } else {
        const res = await getAdminProducts({ ...filters, page, page_size: 10 });
        setList(res.list);
        setTotal(res.total);
      }
    } catch { /* 拦截器提示 */ } finally { setLoading(false); }
  }, [filters, page, activeTab]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getAdminSeries().then(setSeries).catch(() => {}); getAdminSpaces().then(setSpaces).catch(() => {}); }, []);

  /** 打开产品表单（新建/编辑回填） */
  async function openForm(id?: number) {
    setEditingId(id ?? null);
    if (id) {
      const p = await getAdminProduct(id);
      form.setFieldsValue({
        name: p.name, product_no: p.product_no, series_id: p.series_id, category_id: p.category_id,
        retail_price: p.retail_price, dealer_price: p.dealer_price, stock: p.stock, stock_warn: p.stock_warn,
        publish_status: p.publish_status, is_top: p.is_top, is_recommend: p.is_recommend, is_new: p.is_new,
        size: p.size, material: p.material, craft: p.craft, warranty: p.warranty,
        style_tags: p.style_tags ?? "",
        detail_html: p.detail_html ?? "",
        specs: p.specs && Object.keys(p.specs).length > 0 ? JSON.stringify(p.specs, null, 2) : "",
        spaces: p.spaces ?? [],
      });
      // 回填封面与图集（URL 转 UploadFile）
      setCoverFiles(p.cover_image_url ? [{ uid: "-cover", name: "封面", status: "done", url: p.cover_image_url }] : []);
      setGalleryFiles((p.images ?? []).map((u, i) => ({ uid: `g-${i}`, name: `图${i + 1}`, status: "done", url: u })));
    } else {
      form.resetFields();
      form.setFieldsValue({ stock: 0, stock_warn: 5, publish_status: "draft" });
      setCoverFiles([]);
      setGalleryFiles([]);
    }
    setModalOpen(true);
  }

  /** 提交产品表单：合并图片 URL（封面单图 / 图集多图数组） */
  async function handleOk() {
    const values = await form.validateFields();
    // 规格参数 specs 以 JSON 文本编辑，提交时解析为对象（空串视为清空）
    let specs: Record<string, string> | null = null;
    if (values.specs && String(values.specs).trim()) {
      try {
        specs = JSON.parse(values.specs);
      } catch {
        message.error("规格参数 JSON 格式有误，请检查");
        return;
      }
    }
    // 图片字段组装：封面取第一张，图集取全部 URL（数据库 images JSON 数组，ADR-003）
    const payload = {
      ...values,
      specs,
      cover_image_url: fileUrl(coverFiles[0]) ?? null,
      images: galleryFiles.map((f) => fileUrl(f)).filter(Boolean) as string[],
    };
    try {
      if (editingId) { await updateAdminProduct(editingId, payload); message.success("产品已更新"); }
      else { await createAdminProduct(payload); message.success("产品已创建"); }
      setModalOpen(false);
      load();
    } catch { /* 拦截器提示 */ }
  }

  /** 软删除（Popconfirm 二次确认） */
  async function handleDelete(id: number) {
    try {
      await deleteAdminProduct(id);
      message.success("产品已删除（软删除，历史签单不受影响）");
      load();
    } catch { /* 拦截器提示 */ }
  }

  /** 批量调价提交 */
  async function handlePrice() {
    const values = await priceForm.validateFields();
    try {
      const res = await batchPrice(values);
      message.success(`批量调价完成，共影响 ${res.affected} 个产品`);
      setPriceOpen(false);
      load();
    } catch { /* 拦截器提示 */ }
  }

  const columns = [
    { title: "封面", dataIndex: "cover_image_url", width: 70, render: (v: string | null) => v ? <img src={v} alt="" className="w-12 h-9 rounded object-cover" /> : "-" },
    { title: "名称", dataIndex: "name", render: (v: string) => <span className="text-gold-soft">{v}</span> },
    { title: "编号", dataIndex: "product_no", width: 110 },
    { title: "系列", dataIndex: "series_name", width: 90 },
    { title: "零售价", dataIndex: "retail_price", width: 100, render: (v: number | null) => v !== null ? `¥${v.toLocaleString("zh-CN")}` : "待定" },
    { title: "库存", dataIndex: "stock", width: 100, render: (v: number, r: AdminProduct) => r.low_stock ? <Tag color="error">预警 {v}</Tag> : v },
    {
      title: "状态", dataIndex: "publish_status", width: 90,
      render: (v: string) => ({ on_shelf: <Tag color="success">上架</Tag>, off_shelf: <Tag>下架</Tag>, draft: <Tag color="warning">草稿</Tag> }[v] ?? <Tag>{v}</Tag>),
    },
    {
      title: "操作", width: 180, render: (_: unknown, r: AdminProduct) => (
        <Space>
          <Button size="small" onClick={() => openForm(r.id)}>编辑</Button>
          <Popconfirm title="确认删除该产品？（软删除）" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-cream font-serif-title tracking-[2px]">产品管理</h2>
        <Space>
          <Button onClick={() => setPriceOpen(true)}>批量调价</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>新建产品</Button>
        </Space>
      </div>

      {/* Tab：全部 / 库存预警（PRD 7.1.1） */}
      <Tabs
        activeKey={activeTab}
        onChange={(k) => { setActiveTab(k); setPage(1); }}
        items={[{ key: "all", label: "全部产品" }, { key: "low", label: "库存预警" }]}
      />

      {/* 筛选区（系列 / 状态 / 关键词） */}
      <div className="flex gap-3 mb-4">
        <Select
          allowClear placeholder="全部系列" style={{ width: 160 }}
          value={filters.series_id} onChange={(v) => { setFilters({ ...filters, series_id: v }); setPage(1); }}
          options={series.map((s) => ({ value: s.id, label: s.name }))}
        />
        <Select
          allowClear placeholder="全部状态" style={{ width: 130 }}
          value={filters.publish_status || undefined} onChange={(v) => { setFilters({ ...filters, publish_status: v ?? "" }); setPage(1); }}
          options={[{ value: "on_shelf", label: "上架" }, { value: "off_shelf", label: "下架" }, { value: "draft", label: "草稿" }]}
        />
        <Input.Search
          placeholder="搜索名称/编号" style={{ width: 240 }}
          onSearch={(kw) => { setFilters({ ...filters, kw }); setPage(1); }}
        />
      </div>

      <Table
        rowKey="id" dataSource={list} columns={columns} loading={loading}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage, showTotal: (t) => `共 ${t} 条` }}
      />

      {/* 产品表单弹窗 */}
      <Modal title={editingId ? "编辑产品" : "新建产品"} open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)} width={720} destroyOnClose>
        <Form form={form} layout="vertical">
          {/* ---- 图片管理（P6：后台直接更换产品图片，上传走 /admin/upload）---- */}
          <div className="grid grid-cols-2 gap-x-4 mb-2">
            {/* 封面图：单图，建议 4:3，列表卡片/详情主图使用 */}
            <Form.Item label="封面图（建议 4:3）">
              <Upload
                listType="picture-card"
                maxCount={1}
                accept="image/*"
                fileList={coverFiles}
                customRequest={imageUploadRequest}
                onChange={({ fileList }) => setCoverFiles(fileList)}
                onRemove={() => setCoverFiles([])}
              >
                {coverFiles.length === 0 && (
                  <div>
                    <PlusOutlined />
                    <div className="text-xs mt-1">上传封面</div>
                  </div>
                )}
              </Upload>
            </Form.Item>
            {/* 详情图集：多图（最多 9 张，UIUX §13.2 建议 ≥5 张） */}
            <Form.Item label="详情图集（多张，第一张也可作封面）">
              <Upload
                listType="picture-card"
                accept="image/*"
                multiple
                fileList={galleryFiles}
                customRequest={imageUploadRequest}
                onChange={({ fileList }) => setGalleryFiles(fileList.slice(0, 9))}
              >
                {galleryFiles.length < 9 && (
                  <div>
                    <PlusOutlined />
                    <div className="text-xs mt-1">上传图集</div>
                  </div>
                )}
              </Upload>
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="name" label="产品名称" rules={[{ required: true }]}><Input maxLength={100} /></Form.Item>
            <Form.Item name="product_no" label="产品编号" rules={[{ required: true }]}><Input maxLength={50} /></Form.Item>
            <Form.Item name="series_id" label="所属系列" rules={[{ required: true }]}>
              <Select options={series.map((s) => ({ value: s.id, label: s.name }))} />
            </Form.Item>
            <Form.Item name="category_id" label="主空间分类">
              <Select allowClear options={spaces.map((s) => ({ value: s.id, label: s.name }))} />
            </Form.Item>
            <Form.Item name="retail_price" label="零售价"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="dealer_price" label="经销商价（留空按折扣折算）"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="stock" label="库存"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="stock_warn" label="库存预警阈值"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="size" label="尺寸"><Input /></Form.Item>
            <Form.Item name="material" label="材质"><Input /></Form.Item>
            <Form.Item name="craft" label="工艺"><Input /></Form.Item>
            <Form.Item name="warranty" label="质保"><Input /></Form.Item>
            <Form.Item name="style_tags" label="风格标签（逗号分隔）"><Input placeholder="如：现代、简约、轻奢" /></Form.Item>
          </div>

          {/* 产品介绍（富文本编辑器 TinyMCE，HTML 存储，前台 DOMPurify 清洗渲染） */}
          <Form.Item name="detail_html" label="产品介绍（富文本，支持图文/表格）">
            <RichTextEditor />
          </Form.Item>
          {/* 规格参数（JSON，如板材/五金等详细参数） */}
          <Form.Item name="specs" label="规格参数（JSON，留空表示无）" tooltip={'格式：{"板材": "ENF 级实木多层板"}'}>
            <Input.TextArea rows={4} placeholder={'{\n  "板材": "ENF 级实木多层板",\n  "五金": "进口阻尼铰链"\n}'} />
          </Form.Item>
          {/* 适用空间（M:N，可多选） */}
          <Form.Item name="spaces" label="适用空间（可多选）">
            <Select mode="multiple" allowClear placeholder="选择适用空间" options={spaces.map((s) => ({ value: s.id, label: s.name }))} />
          </Form.Item>

          <Form.Item name="publish_status" label="发布状态">
            <Select options={[{ value: "on_shelf", label: "上架" }, { value: "off_shelf", label: "下架" }, { value: "draft", label: "草稿" }]} />
          </Form.Item>
          <div className="grid grid-cols-3 gap-x-4">
            <Form.Item name="is_top" label="置顶" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="is_recommend" label="首页精选" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="is_new" label="新品" valuePropName="checked"><Switch /></Form.Item>
          </div>
        </Form>
      </Modal>

      {/* 批量调价弹窗（PRD 7.1.1 P1） */}
      <Modal title="批量调价" open={priceOpen} onOk={handlePrice} onCancel={() => setPriceOpen(false)} destroyOnClose>
        <Form form={priceForm} layout="vertical" initialValues={{ scope: "all", mode: "percent", value: 10 }}>
          <Form.Item name="scope" label="调价范围">
            <Select options={[
              { value: "all", label: "全部产品" },
              { value: "series", label: "按系列" },
              { value: "ids", label: "按产品 ID" },
            ]} />
          </Form.Item>
          <Form.Item name="series_id" label="系列 ID（范围=按系列时填写）"><InputNumber min={1} style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="product_ids" label="产品 ID 列表（范围=按 ID 时填写，逗号分隔）">
            <Input placeholder="如：1,2,3" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="mode" label="方式">
              <Select options={[{ value: "percent", label: "百分比（10=涨10%，-10=降10%）" }, { value: "fixed", label: "固定金额" }]} />
            </Form.Item>
            <Form.Item name="value" label="数值"><InputNumber style={{ width: "100%" }} /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
