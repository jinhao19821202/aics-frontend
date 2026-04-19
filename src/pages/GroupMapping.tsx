import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, Popconfirm, Select, Space, Table, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { adminApi } from '@/api/endpoints';

export default function GroupMappingPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [drawer, setDrawer] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin:groups', page, size],
    queryFn: () => adminApi.listGroupMappings({ page, size }),
  });

  const save = useMutation({
    mutationFn: (body: any) => adminApi.upsertGroupMapping(body),
    onSuccess: () => {
      message.success('保存成功');
      setDrawer({ open: false });
      qc.invalidateQueries({ queryKey: ['admin:groups'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteGroupMapping(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin:groups'] }),
  });

  const openEdit = (r?: any) => {
    form.resetFields();
    if (r) form.setFieldsValue(r);
    setDrawer({ open: true, editing: r });
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '群 ID', dataIndex: 'groupId' },
    { title: '群名称', dataIndex: 'groupName' },
    {
      title: 'Agents', dataIndex: 'agentUserids',
      render: (v: string[]) => (v || []).join(', '),
    },
    { title: '默认 Agent', dataIndex: 'defaultAgent', width: 160 },
    {
      title: '操作', width: 180,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="删除该映射？" onConfirm={() => remove.mutate(r.id)}>
            <Button danger size="small" icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>新增映射</Button>
      </Space>
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={data?.items || []}
        pagination={{
          current: page, pageSize: size, total: data?.total || 0,
          onChange: (p, s) => { setPage(p); setSize(s); },
        }} />
      <Drawer
        title={drawer.editing ? '编辑群映射' : '新增群映射'}
        width={540} open={drawer.open} onClose={() => setDrawer({ open: false })}
        footer={<Button type="primary" onClick={() => form.submit()} loading={save.isPending}>保存</Button>}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item label="群 ID" name="groupId" rules={[{ required: true }]}>
            <Input disabled={!!drawer.editing} />
          </Form.Item>
          <Form.Item label="群名称" name="groupName"><Input /></Form.Item>
          <Form.Item label="坐席 UserID 列表" name="agentUserids">
            <Select mode="tags" tokenSeparators={[',', ' ']} placeholder="输入后回车" />
          </Form.Item>
          <Form.Item label="默认坐席" name="defaultAgent"><Input /></Form.Item>
        </Form>
      </Drawer>
    </Space>
  );
}
