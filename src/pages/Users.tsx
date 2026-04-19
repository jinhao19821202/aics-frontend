import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, Popconfirm, Select, Space, Switch, Table, Tag, message } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { adminApi } from '@/api/endpoints';

export default function UsersPage() {
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [drawer, setDrawer] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin:users', keyword, page, size],
    queryFn: () => adminApi.listUsers({ keyword, page, size }),
  });
  const roles = useQuery({ queryKey: ['admin:roles'], queryFn: () => adminApi.listRoles() });

  const save = useMutation({
    mutationFn: (body: any) => drawer.editing ? adminApi.updateUser(drawer.editing.id, body) : adminApi.createUser(body),
    onSuccess: () => {
      message.success('保存成功');
      setDrawer({ open: false });
      qc.invalidateQueries({ queryKey: ['admin:users'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin:users'] }),
  });

  const openEdit = (r?: any) => {
    form.resetFields();
    if (r) {
      form.setFieldsValue({
        ...r,
        roleIds: r.roles?.map((x: any) => x.id),
      });
    }
    setDrawer({ open: true, editing: r });
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username' },
    { title: '显示名', dataIndex: 'displayName' },
    { title: '邮箱', dataIndex: 'email' },
    {
      title: '角色', dataIndex: 'roles',
      render: (arr: any[]) => (arr || []).map((r) => <Tag key={r.id}>{r.name}</Tag>),
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
          <Popconfirm title="删除用户？" onConfirm={() => remove.mutate(r.id)}>
            <Button danger size="small" icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space>
        <Input.Search placeholder="搜索用户名" allowClear onSearch={(v) => { setKeyword(v); setPage(1); }} style={{ width: 240 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>新增用户</Button>
      </Space>
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={data?.items || []}
        pagination={{
          current: page, pageSize: size, total: data?.total || 0, showSizeChanger: true,
          onChange: (p, s) => { setPage(p); setSize(s); },
        }} />
      <Drawer
        title={drawer.editing ? `编辑用户 #${drawer.editing.id}` : '新增用户'}
        width={540} open={drawer.open} onClose={() => setDrawer({ open: false })}
        footer={<Button type="primary" onClick={() => form.submit()} loading={save.isPending}>保存</Button>}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ enabled: true }} onFinish={(v) => save.mutate(v)}>
          <Form.Item label="用户名" name="username" rules={[{ required: !drawer.editing }]}>
            <Input disabled={!!drawer.editing} />
          </Form.Item>
          <Form.Item label={drawer.editing ? '重设密码 (留空不变)' : '密码'} name="password" rules={[{ required: !drawer.editing }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item label="显示名" name="displayName"><Input /></Form.Item>
          <Form.Item label="邮箱" name="email"><Input /></Form.Item>
          <Form.Item label="角色" name="roleIds">
            <Select mode="multiple" options={(roles.data || []).map((r: any) => ({ value: r.id, label: r.name }))} />
          </Form.Item>
          <Form.Item label="数据权限 (群 ID 列表，空=全部)" name="groupScope">
            <Select mode="tags" tokenSeparators={[',', ' ']} placeholder="输入群 ID 后回车" />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Drawer>
    </Space>
  );
}
