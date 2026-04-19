import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, Popconfirm, Space, Table, Tag, Transfer, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { adminApi } from '@/api/endpoints';

export default function RolesPage() {
  const qc = useQueryClient();
  const [drawer, setDrawer] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [form] = Form.useForm();
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const roles = useQuery({ queryKey: ['admin:roles:list'], queryFn: () => adminApi.listRoles() });
  const perms = useQuery({ queryKey: ['admin:perms'], queryFn: () => adminApi.allPermissions() });

  const save = useMutation({
    mutationFn: (body: any) => drawer.editing ? adminApi.updateRole(drawer.editing.id, body) : adminApi.createRole(body),
    onSuccess: () => {
      message.success('保存成功');
      setDrawer({ open: false });
      qc.invalidateQueries({ queryKey: ['admin:roles:list'] });
      qc.invalidateQueries({ queryKey: ['admin:roles'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin:roles:list'] }),
  });

  const openEdit = (r?: any) => {
    form.resetFields();
    if (r) form.setFieldsValue(r);
    setSelectedPerms(r?.permissions || []);
    setDrawer({ open: true, editing: r });
  };

  const submit = () => {
    form.validateFields().then((v) => save.mutate({ ...v, permissionCodes: selectedPerms }));
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '名称', dataIndex: 'name', width: 160 },
    { title: '描述', dataIndex: 'description' },
    {
      title: '内置', dataIndex: 'builtIn', width: 80,
      render: (v: boolean) => <Tag color={v ? 'blue' : 'default'}>{v ? '是' : '否'}</Tag>,
    },
    { title: '权限数', dataIndex: 'permissions', width: 100, render: (v: string[]) => v?.length || 0 },
    {
      title: '操作', width: 220,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          {!r.builtIn && (
            <Popconfirm title="删除该角色？" onConfirm={() => remove.mutate(r.id)}>
              <Button danger size="small" icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const transferData = (perms.data || []).map((p: any) => ({ key: p.code, title: p.code, description: p.description }));

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>新增角色</Button>
      </Space>
      <Table rowKey="id" columns={columns as any} dataSource={roles.data || []} pagination={false} loading={roles.isLoading} />
      <Drawer
        title={drawer.editing ? `编辑角色 #${drawer.editing.id}` : '新增角色'}
        width={760} open={drawer.open} onClose={() => setDrawer({ open: false })}
        footer={<Button type="primary" onClick={submit} loading={save.isPending}>保存</Button>}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="角色名" name="name" rules={[{ required: true }]}>
            <Input disabled={!!drawer.editing?.builtIn} />
          </Form.Item>
          <Form.Item label="描述" name="description"><Input /></Form.Item>
          <Form.Item label="权限">
            <Transfer
              dataSource={transferData}
              targetKeys={selectedPerms}
              onChange={(v) => setSelectedPerms(v as string[])}
              render={(i) => `${i.title} — ${i.description || ''}`}
              listStyle={{ width: 320, height: 360 }}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </Space>
  );
}
