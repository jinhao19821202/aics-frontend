import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Drawer, Form, Input, Popconfirm, Select, Space, Switch, Table, Tabs, Tag, message } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import { sensitiveApi } from '@/api/endpoints';
import dayjs from 'dayjs';

const CATEGORIES = ['POLITICS', 'PORN', 'VIOLENCE', 'PRIVACY', 'COMPETITOR', 'CUSTOM'];
const LEVELS = ['HIGH', 'MEDIUM', 'LOW'];
const ACTIONS = ['BLOCK', 'MASK', 'ALERT'];

function WordsTab() {
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [drawer, setDrawer] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [form] = Form.useForm();
  const [testText, setTestText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sens:words', keyword, page, size],
    queryFn: () => sensitiveApi.list({ keyword, page, size }),
  });

  const save = useMutation({
    mutationFn: (body: any) => (drawer.editing ? sensitiveApi.update(drawer.editing.id, body) : sensitiveApi.create(body)),
    onSuccess: () => {
      message.success('保存成功');
      setDrawer({ open: false });
      qc.invalidateQueries({ queryKey: ['sens:words'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => sensitiveApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sens:words'] }),
  });

  const reload = useMutation({
    mutationFn: () => sensitiveApi.reload(),
    onSuccess: () => message.success('已广播重载信号'),
  });

  const testMutation = useMutation({
    mutationFn: (text: string) => sensitiveApi.test(text),
    onSuccess: (d: any) => {
      if (d.blocked) message.error(`命中 ${d.hitWord} (${d.level})，已阻断`);
      else if (d.processed !== testText) message.warning(`已打码: ${d.processed}`);
      else message.success('未命中');
    },
  });

  const openEdit = (r?: any) => {
    form.resetFields();
    if (r) form.setFieldsValue(r);
    setDrawer({ open: true, editing: r });
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '词', dataIndex: 'word' },
    { title: '分类', dataIndex: 'category', width: 120 },
    { title: '等级', dataIndex: 'level', width: 80 },
    {
      title: '动作', dataIndex: 'action', width: 80,
      render: (v: string) => <Tag color={v === 'BLOCK' ? 'red' : v === 'MASK' ? 'orange' : 'blue'}>{v}</Tag>,
    },
    {
      title: '启用', dataIndex: 'enabled', width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作', width: 180,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="删除该敏感词？" onConfirm={() => remove.mutate(r.id)}>
            <Button danger size="small" icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space wrap>
        <Input.Search placeholder="搜索词" allowClear onSearch={(v) => { setKeyword(v); setPage(1); }} style={{ width: 240 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>新增</Button>
        <Button icon={<ReloadOutlined />} onClick={() => reload.mutate()} loading={reload.isPending}>广播重载</Button>
      </Space>
      <Card title="测试" size="small">
        <Space.Compact style={{ width: '100%' }}>
          <Input value={testText} onChange={(e) => setTestText(e.target.value)} placeholder="输入文本验证命中" />
          <Button type="primary" onClick={() => testMutation.mutate(testText)} loading={testMutation.isPending}>测试</Button>
        </Space.Compact>
      </Card>
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={data?.items || []}
        pagination={{
          current: page, pageSize: size, total: data?.total || 0, showSizeChanger: true,
          onChange: (p, s) => { setPage(p); setSize(s); },
        }} />
      <Drawer
        title={drawer.editing ? '编辑敏感词' : '新增敏感词'}
        width={480}
        open={drawer.open}
        onClose={() => setDrawer({ open: false })}
        footer={<Button type="primary" onClick={() => form.submit()} loading={save.isPending}>保存</Button>}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ category: 'CUSTOM', level: 'MEDIUM', action: 'MASK', enabled: true }}
          onFinish={(v) => save.mutate(v)}>
          <Form.Item label="词" name="word" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="分类" name="category"><Select options={CATEGORIES.map((v) => ({ value: v, label: v }))} /></Form.Item>
          <Form.Item label="等级" name="level"><Select options={LEVELS.map((v) => ({ value: v, label: v }))} /></Form.Item>
          <Form.Item label="动作" name="action"><Select options={ACTIONS.map((v) => ({ value: v, label: v }))} /></Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Drawer>
    </Space>
  );
}

function HitsTab() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const { data, isLoading } = useQuery({
    queryKey: ['sens:hits', page, size],
    queryFn: () => sensitiveApi.hits({ page, size }),
  });

  const columns = [
    { title: '时间', dataIndex: 'createdAt', width: 160, render: (v: string) => v && dayjs(v).format('MM-DD HH:mm:ss') },
    { title: '方向', dataIndex: 'direction', width: 100 },
    { title: '群', dataIndex: 'groupId', width: 180 },
    { title: '词', dataIndex: 'word' },
    { title: '等级', dataIndex: 'level', width: 80 },
    { title: '动作', dataIndex: 'actionTaken', width: 80 },
  ];
  return (
    <Table rowKey="id" size="small" loading={isLoading} columns={columns as any} dataSource={data?.items || []}
      pagination={{
        current: page, pageSize: size, total: data?.total || 0, showSizeChanger: true,
        onChange: (p, s) => { setPage(p); setSize(s); },
      }} />
  );
}

export default function SensitivePage() {
  return (
    <Tabs
      items={[
        { key: 'words', label: '敏感词管理', children: <WordsTab /> },
        { key: 'hits', label: '命中记录', children: <HitsTab /> },
      ]}
    />
  );
}
