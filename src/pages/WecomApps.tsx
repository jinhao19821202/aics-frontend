import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
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
  ThunderboltOutlined,
  CopyOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { wecomAppApi, type WecomApp, type WecomAppBody } from '@/api/endpoints';

const STATUS_COLOR: Record<WecomApp['status'], string> = {
  NOT_VERIFIED: 'default',
  VERIFIED: 'green',
  FAILED: 'red',
};

const STATUS_LABEL: Record<WecomApp['status'], string> = {
  NOT_VERIFIED: '未验证',
  VERIFIED: '已验证',
  FAILED: '验证失败',
};

export default function WecomAppsPage() {
  const qc = useQueryClient();
  const [drawer, setDrawer] = useState<{ open: boolean; editing?: WecomApp }>({ open: false });
  const [form] = Form.useForm<WecomAppBody>();

  const { data, isLoading } = useQuery({
    queryKey: ['wecom-apps'],
    queryFn: () => wecomAppApi.list(),
  });

  const save = useMutation({
    mutationFn: (body: WecomAppBody) =>
      drawer.editing ? wecomAppApi.update(drawer.editing.id, body) : wecomAppApi.create(body),
    onSuccess: () => {
      message.success('保存成功');
      setDrawer({ open: false });
      qc.invalidateQueries({ queryKey: ['wecom-apps'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '保存失败');
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => wecomAppApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['wecom-apps'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '删除失败');
    },
  });

  const test = useMutation({
    mutationFn: (id: number) => wecomAppApi.test(id),
    onSuccess: (r, id) => {
      if (r.ok) {
        message.success(`连通性 OK（${r.latencyMs}ms）`);
      } else {
        message.error(`测试失败：${r.message}`);
      }
      qc.invalidateQueries({ queryKey: ['wecom-apps'] });
      qc.invalidateQueries({ queryKey: ['wecom-app', id] });
    },
  });

  const openEdit = (r?: WecomApp) => {
    form.resetFields();
    if (r) {
      form.setFieldsValue({
        name: r.name,
        corpId: r.corpId,
        agentId: r.agentId,
        botUserid: r.botUserid,
        apiBase: r.apiBase,
        enabled: r.enabled,
      });
    }
    setDrawer({ open: true, editing: r });
  };

  const copyUrl = (url?: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    message.success('已复制');
  };

  const columns = [
    { title: '名称', dataIndex: 'name', width: 160 },
    { title: 'CorpId', dataIndex: 'corpId', width: 220, ellipsis: true as const },
    { title: 'AgentId', dataIndex: 'agentId', width: 110 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (s: WecomApp['status']) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>,
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag>,
    },
    {
      title: '绑定智能客服',
      dataIndex: 'csAgentName',
      width: 160,
      render: (v?: string | null, r?: WecomApp) =>
        v ? <Tag color="blue">{v}</Tag> : <Typography.Text type="secondary">未绑定</Typography.Text>,
    },
    {
      title: '最近测试',
      dataIndex: 'lastTestAt',
      width: 160,
      render: (_: any, r: WecomApp) =>
        r.lastTestAt ? (
          <Tooltip title={r.lastTestMsg || ''}>
            <Tag color={r.lastTestOk ? 'green' : 'red'}>
              {r.lastTestOk ? '成功' : '失败'} {new Date(r.lastTestAt).toLocaleString()}
            </Tag>
          </Tooltip>
        ) : (
          <Typography.Text type="secondary">-</Typography.Text>
        ),
    },
    {
      title: '回调 URL',
      dataIndex: 'callbackUrl',
      render: (v?: string) =>
        v ? (
          <Space size={4}>
            <Typography.Text code copyable={{ text: v }} style={{ maxWidth: 320 }} ellipsis>
              {v}
            </Typography.Text>
          </Space>
        ) : (
          '-'
        ),
    },
    {
      title: '操作',
      width: 240,
      fixed: 'right' as const,
      render: (_: any, r: WecomApp) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Button
            size="small"
            icon={<ThunderboltOutlined />}
            loading={test.isPending && test.variables === r.id}
            onClick={() => test.mutate(r.id)}
          >
            测试
          </Button>
          <Popconfirm
            title="删除该企微应用？"
            description={r.csAgentId ? '该应用已绑定智能客服，请先解绑' : undefined}
            disabled={!!r.csAgentId}
            onConfirm={() => remove.mutate(r.id)}
          >
            <Button danger size="small" icon={<DeleteOutlined />} disabled={!!r.csAgentId}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="在这里管理企微「自建应用」的接入配置。"
        description={
          <div>
            保存后底部会生成「回调 URL」；把它粘贴到企微后台「接收消息 → 回调 URL」。企微首次验签通过即状态变为「已验证」。
            <br />
            AES Key / Secret 明文仅在本次提交时存在，落库即加密；响应仅返回占位符（●●●●），编辑时留空表示不修改。
          </div>
        }
      />

      <Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>
          新增应用
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns as any}
        dataSource={data || []}
        pagination={false}
        scroll={{ x: 1400 }}
      />

      <Drawer
        title={drawer.editing ? `编辑：${drawer.editing.name}` : '新增企微应用'}
        width={560}
        open={drawer.open}
        onClose={() => setDrawer({ open: false })}
        destroyOnClose
        footer={
          <Space>
            <Button onClick={() => setDrawer({ open: false })}>取消</Button>
            <Button type="primary" onClick={() => form.submit()} loading={save.isPending}>
              保存
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ enabled: true }}
          onFinish={(v) => {
            const body: WecomAppBody = {};
            Object.entries(v).forEach(([k, val]) => {
              if (val === undefined) return;
              if (typeof val === 'string' && val.trim() === '' && drawer.editing) return;
              (body as any)[k] = val;
            });
            save.mutate(body);
          }}
        >
          <Form.Item label="名称" name="name" rules={[{ required: !drawer.editing, max: 64 }]}>
            <Input placeholder="如：HR 应用" />
          </Form.Item>
          <Form.Item label="CorpId" name="corpId" rules={[{ required: !drawer.editing }]}>
            <Input placeholder="ww1abc...xyz（企业 ID）" />
          </Form.Item>
          <Form.Item label="AgentId" name="agentId" rules={[{ required: !drawer.editing }]}>
            <InputNumber style={{ width: '100%' }} placeholder="自建应用 ID" />
          </Form.Item>
          <Form.Item
            label="Token"
            name="token"
            rules={[{ required: !drawer.editing, min: 3, max: 32 }]}
            extra="3-32 位字母数字，与企微后台一致"
          >
            <Input placeholder={drawer.editing ? '留空保持不变' : ''} />
          </Form.Item>
          <Form.Item
            label="EncodingAESKey (43 位)"
            name="aesKey"
            rules={[{ required: !drawer.editing, len: 43 }]}
            extra={drawer.editing ? '留空保持不变；填写则覆盖（并需重新验证）' : '43 位字符'}
          >
            <Input placeholder={drawer.editing ? '●●●●（留空保持不变）' : ''} />
          </Form.Item>
          <Form.Item
            label="Secret"
            name="secret"
            rules={[{ required: !drawer.editing }]}
            extra={drawer.editing ? '留空保持不变；轮换时填入新值' : '自建应用 Secret'}
          >
            <Input.Password
              placeholder={drawer.editing ? '●●●●（留空保持不变）' : ''}
              autoComplete="off"
            />
          </Form.Item>
          <Form.Item
            label="机器人 Userid (BotUserid)"
            name="botUserid"
            extra="机器人在企微中的 userid；用于判定消息是否 @ 了机器人"
          >
            <Input placeholder="hrBot" />
          </Form.Item>
          <Form.Item label="API Base（可选）" name="apiBase" extra="默认 https://qyapi.weixin.qq.com；专属版企微才需要覆盖">
            <Input placeholder="https://qyapi.weixin.qq.com" />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>

          {drawer.editing?.callbackUrl && (
            <Alert
              type="success"
              icon={<LinkOutlined />}
              message="回调 URL"
              description={
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Typography.Text code copyable={{ text: drawer.editing.callbackUrl }}>
                    {drawer.editing.callbackUrl}
                  </Typography.Text>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyUrl(drawer.editing?.callbackUrl)}
                  >
                    复制
                  </Button>
                </Space>
              }
            />
          )}
        </Form>
      </Drawer>
    </Space>
  );
}
