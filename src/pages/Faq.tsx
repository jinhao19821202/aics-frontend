import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Badge,
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  SettingOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { faqApi, faqGroupApi, type FaqGroup, type FaqGroupBody } from '@/api/endpoints';

interface FaqRow {
  id: number;
  question: string;
  answer: string;
  keywords?: string;
  enabled: boolean;
  groupId?: number;
}

type GroupFilter = 'all' | number;

export default function FaqPage() {
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');

  const [faqDrawer, setFaqDrawer] = useState<{ open: boolean; editing?: FaqRow }>({ open: false });
  const [faqForm] = Form.useForm<FaqRow>();

  const [groupModal, setGroupModal] = useState<{ open: boolean; editing?: FaqGroup }>({ open: false });
  const [groupForm] = Form.useForm<FaqGroupBody>();

  const { data: groups = [] } = useQuery({
    queryKey: ['faq-groups'],
    queryFn: () => faqGroupApi.list(),
  });

  const groupById = useMemo(() => {
    const m = new Map<number, FaqGroup>();
    groups.forEach((g) => m.set(g.id, g));
    return m;
  }, [groups]);

  const listParams = useMemo(() => {
    const p: Record<string, unknown> = { page, size };
    if (keyword.trim()) p.keyword = keyword.trim();
    if (groupFilter !== 'all') p.groupId = groupFilter;
    return p;
  }, [page, size, keyword, groupFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['faqs', listParams],
    queryFn: () => faqApi.list(listParams),
  });

  const saveFaq = useMutation({
    mutationFn: (body: any) =>
      faqDrawer.editing ? faqApi.update(faqDrawer.editing.id, body) : faqApi.create(body),
    onSuccess: () => {
      message.success('保存成功');
      setFaqDrawer({ open: false });
      qc.invalidateQueries({ queryKey: ['faqs'] });
      qc.invalidateQueries({ queryKey: ['faq-groups'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || '保存失败'),
  });

  const removeFaq = useMutation({
    mutationFn: (id: number) => faqApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faqs'] });
      qc.invalidateQueries({ queryKey: ['faq-groups'] });
    },
  });

  const reindex = useMutation({
    mutationFn: () => faqApi.reindex(),
    onSuccess: (r) => {
      Modal.success({
        title: 'FAQ 向量重建完成',
        content: `共 ${r.total} 条，成功 ${r.ok}，失败 ${r.failed}${r.failed > 0 ? '（失败项请在日志排查 embedding 配置）' : ''}`,
      });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '重建失败：请确认 embedding LLM 已配置');
    },
  });

  const saveGroup = useMutation({
    mutationFn: (body: FaqGroupBody) =>
      groupModal.editing ? faqGroupApi.update(groupModal.editing.id, body) : faqGroupApi.create(body),
    onSuccess: () => {
      message.success('保存成功');
      setGroupModal({ open: false });
      qc.invalidateQueries({ queryKey: ['faq-groups'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || '保存失败'),
  });

  const removeGroup = useMutation({
    mutationFn: (id: number) => faqGroupApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['faq-groups'] });
      qc.invalidateQueries({ queryKey: ['faqs'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.message || '删除失败'),
  });

  const openFaqEdit = (r?: FaqRow) => {
    faqForm.resetFields();
    if (r) {
      faqForm.setFieldsValue(r);
    } else if (groupFilter !== 'all') {
      faqForm.setFieldsValue({ groupId: groupFilter });
    }
    setFaqDrawer({ open: true, editing: r });
  };

  const openGroupEdit = (g?: FaqGroup) => {
    groupForm.resetFields();
    if (g) {
      groupForm.setFieldsValue({
        name: g.name,
        description: g.description,
        sortOrder: g.sortOrder,
      });
    }
    setGroupModal({ open: true, editing: g });
  };

  const totalFaqCount = groups.reduce((acc, g) => acc + (g.faqCount || 0), 0);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    {
      title: '分组',
      dataIndex: 'groupId',
      width: 140,
      render: (gid?: number) => {
        const g = gid ? groupById.get(gid) : undefined;
        return g ? <Tag color="geekblue">{g.name}</Tag> : <Typography.Text type="secondary">-</Typography.Text>;
      },
    },
    { title: '问题', dataIndex: 'question', ellipsis: true as const },
    { title: '关键词', dataIndex: 'keywords', width: 220, ellipsis: true as const },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      width: 180,
      render: (_: any, r: FaqRow) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openFaqEdit(r)}>编辑</Button>
          <Popconfirm title="删除该 FAQ？" onConfirm={() => removeFaq.mutate(r.id)}>
            <Button danger size="small" icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', minHeight: 520 }}>
      {/* 左：分组侧边栏 */}
      <div
        style={{
          width: 260,
          flexShrink: 0,
          borderRight: '1px solid #f0f0f0',
          paddingRight: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Text strong>
            <AppstoreOutlined /> 分组
          </Typography.Text>
          <Button size="small" icon={<PlusOutlined />} onClick={() => openGroupEdit()}>
            新建
          </Button>
        </Space>

        <GroupItem
          active={groupFilter === 'all'}
          onClick={() => { setGroupFilter('all'); setPage(1); }}
          label="全部 FAQ"
          count={totalFaqCount}
          icon={<FolderOpenOutlined />}
        />

        {groups.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="尚无分组"
            style={{ marginTop: 16 }}
          />
        ) : (
          groups.map((g) => (
            <div
              key={g.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                background: groupFilter === g.id ? '#e6f4ff' : undefined,
              }}
              onClick={() => { setGroupFilter(g.id); setPage(1); }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <Space>
                  <FolderOutlined style={{ color: '#1677ff' }} />
                  <Typography.Text ellipsis style={{ maxWidth: 120 }}>{g.name}</Typography.Text>
                </Space>
                {g.description && (
                  <Tooltip title={g.description}>
                    <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginLeft: 22 }}>
                      {g.description}
                    </Typography.Text>
                  </Tooltip>
                )}
              </div>
              <Space>
                <Badge count={g.faqCount} showZero overflowCount={999} color="#bfbfbf" />
                <Tooltip title="编辑分组">
                  <Button
                    size="small"
                    type="text"
                    icon={<SettingOutlined />}
                    onClick={(e) => { e.stopPropagation(); openGroupEdit(g); }}
                  />
                </Tooltip>
                <Popconfirm
                  title="删除该分组？"
                  description={g.faqCount > 0 ? `分组下尚有 ${g.faqCount} 条 FAQ，无法删除` : undefined}
                  disabled={g.faqCount > 0 || g.name === '默认分组'}
                  onConfirm={() => removeGroup.mutate(g.id)}
                >
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={g.faqCount > 0 || g.name === '默认分组'}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </Space>
            </div>
          ))
        )}
      </div>

      {/* 右：FAQ 列表 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {groupFilter !== 'all' && groupById.get(groupFilter as number) && (
          <Alert
            type="info"
            showIcon
            message={`当前分组：${groupById.get(groupFilter as number)?.name}`}
            description="仅显示该分组下的 FAQ；新增时会默认归入此分组。"
          />
        )}

        <Space>
          <Input.Search
            placeholder="搜索问题"
            allowClear
            onSearch={(v) => { setKeyword(v); setPage(1); }}
            style={{ width: 280 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openFaqEdit()}>
            新增 FAQ
          </Button>
          <Popconfirm
            title="重建所有启用 FAQ 的向量索引？"
            description="会重新调用 embedding 模型对每条 FAQ 的问题计算向量，耗时与条数成正比。"
            onConfirm={() => reindex.mutate()}
          >
            <Button icon={<ReloadOutlined />} loading={reindex.isPending}>重建向量索引</Button>
          </Popconfirm>
        </Space>

        <Table
          rowKey="id"
          loading={isLoading}
          columns={columns as any}
          dataSource={data?.items || []}
          pagination={{
            current: page,
            pageSize: size,
            total: data?.total || 0,
            showSizeChanger: true,
            onChange: (p, s) => { setPage(p); setSize(s); },
          }}
        />
      </div>

      {/* FAQ 编辑抽屉 */}
      <Drawer
        title={faqDrawer.editing ? '编辑 FAQ' : '新增 FAQ'}
        width={600}
        open={faqDrawer.open}
        onClose={() => setFaqDrawer({ open: false })}
        footer={
          <Space>
            <Button onClick={() => setFaqDrawer({ open: false })}>取消</Button>
            <Button type="primary" onClick={() => faqForm.submit()} loading={saveFaq.isPending}>
              保存
            </Button>
          </Space>
        }
        destroyOnClose
      >
        <Form
          form={faqForm}
          layout="vertical"
          initialValues={{ enabled: true }}
          onFinish={(v) => saveFaq.mutate(v)}
        >
          <Form.Item label="问题" name="question" rules={[{ required: true, max: 512 }]}>
            <Input />
          </Form.Item>
          <Form.Item label="答案" name="answer" rules={[{ required: true, max: 2000 }]}>
            <Input.TextArea rows={6} />
          </Form.Item>
          <Form.Item
            label="分组"
            name="groupId"
            extra="未选择时自动归入「默认分组」。"
          >
            <Select
              allowClear
              placeholder="（默认分组）"
              options={groups.map((g) => ({ value: g.id, label: g.name }))}
            />
          </Form.Item>
          <Form.Item label="关键词 (逗号分隔)" name="keywords">
            <Input />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>

      {/* 分组编辑弹窗 */}
      <Modal
        title={groupModal.editing ? `编辑分组：${groupModal.editing.name}` : '新建分组'}
        open={groupModal.open}
        onCancel={() => setGroupModal({ open: false })}
        onOk={() => groupForm.submit()}
        confirmLoading={saveGroup.isPending}
        destroyOnClose
      >
        <Form
          form={groupForm}
          layout="vertical"
          initialValues={{ sortOrder: 0 }}
          onFinish={(v) => saveGroup.mutate(v)}
        >
          <Form.Item label="名称" name="name" rules={[{ required: true, max: 64 }]}>
            <Input placeholder="如：入职指南 / 常见问题" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} maxLength={255} placeholder="（可选）同事间的说明" />
          </Form.Item>
          <Form.Item label="排序" name="sortOrder" extra="数值越小越靠前；相同值按 id 升序。">
            <InputNumber style={{ width: 120 }} min={0} max={999} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function GroupItem({ active, onClick, label, count, icon }: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 8px',
        borderRadius: 6,
        cursor: 'pointer',
        background: active ? '#e6f4ff' : undefined,
      }}
    >
      <div style={{ flex: 1 }}>
        <Space>
          {icon}
          <Typography.Text>{label}</Typography.Text>
        </Space>
      </div>
      <Badge count={count} showZero overflowCount={999} color="#bfbfbf" />
    </div>
  );
}
