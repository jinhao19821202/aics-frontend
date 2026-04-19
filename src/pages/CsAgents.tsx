import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  DisconnectOutlined,
  RobotOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  csAgentApi,
  csAgentMappingApi,
  docApi,
  faqGroupApi,
  llmConfigApi,
  wecomAppApi,
  type CsAgent,
  type CsAgentBody,
} from '@/api/endpoints';

type DrawerTab = 'basic' | 'bind' | 'content';

export default function CsAgentsPage() {
  const qc = useQueryClient();
  const [drawer, setDrawer] = useState<{ open: boolean; editing?: CsAgent; tab: DrawerTab }>({
    open: false,
    tab: 'basic',
  });
  const [form] = Form.useForm<CsAgentBody>();
  const [bindForm] = Form.useForm<{ wecomAppId?: number }>();

  const { data: agents, isLoading } = useQuery({
    queryKey: ['cs-agents'],
    queryFn: () => csAgentApi.list(),
  });
  const { data: llmConfigs } = useQuery({
    queryKey: ['llm-configs'],
    queryFn: () => llmConfigApi.list(),
  });
  const { data: wecomApps } = useQuery({
    queryKey: ['wecom-apps'],
    queryFn: () => wecomAppApi.list(),
  });

  const chatConfigs = (llmConfigs || []).filter((c) => c.purpose === 'chat');

  const save = useMutation({
    mutationFn: (body: CsAgentBody) =>
      drawer.editing ? csAgentApi.update(drawer.editing.id, body) : csAgentApi.create(body),
    onSuccess: () => {
      message.success('保存成功');
      setDrawer({ open: false, tab: 'basic' });
      qc.invalidateQueries({ queryKey: ['cs-agents'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '保存失败');
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => csAgentApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['cs-agents'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '删除失败');
    },
  });

  const bind = useMutation({
    mutationFn: ({ agentId, wecomAppId }: { agentId: number; wecomAppId: number }) =>
      csAgentApi.bind(agentId, wecomAppId),
    onSuccess: (updated) => {
      message.success('绑定成功');
      setDrawer((d) => ({ ...d, editing: updated }));
      qc.invalidateQueries({ queryKey: ['cs-agents'] });
      qc.invalidateQueries({ queryKey: ['wecom-apps'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '绑定失败');
    },
  });

  const unbind = useMutation({
    mutationFn: ({ agentId, wecomAppId }: { agentId: number; wecomAppId: number }) =>
      csAgentApi.unbind(agentId, wecomAppId),
    onSuccess: (updated) => {
      message.success('已解绑');
      setDrawer((d) => ({ ...d, editing: updated }));
      qc.invalidateQueries({ queryKey: ['cs-agents'] });
      qc.invalidateQueries({ queryKey: ['wecom-apps'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '解绑失败');
    },
  });

  const openEdit = (r?: CsAgent) => {
    form.resetFields();
    bindForm.resetFields();
    if (r) {
      form.setFieldsValue({
        name: r.name,
        code: r.code,
        description: r.description,
        avatarUrl: r.avatarUrl,
        personaPrompt: r.personaPrompt,
        greeting: r.greeting,
        chatLlmConfigId: r.chatLlmConfigId ?? undefined,
        enabled: r.enabled,
      });
    }
    setDrawer({ open: true, editing: r, tab: 'basic' });
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      width: 180,
      render: (v: string, r: CsAgent) => (
        <Space>
          <RobotOutlined style={{ color: r.enabled ? '#52c41a' : '#bfbfbf' }} />
          <Typography.Text strong>{v}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Code',
      dataIndex: 'code',
      width: 160,
      render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
    },
    {
      title: '绑定的企微应用',
      dataIndex: 'boundWecomAppName',
      width: 200,
      render: (v: string | null | undefined) =>
        v ? <Tag color="blue">{v}</Tag> : <Typography.Text type="secondary">未绑定</Typography.Text>,
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '停用'}</Tag>,
    },
    {
      title: 'Chat 配置',
      dataIndex: 'chatLlmConfigLabel',
      width: 220,
      render: (v?: string | null) =>
        v ? <Tag>{v}</Tag> : <Typography.Text type="secondary">租户默认</Typography.Text>,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 160,
      render: (v?: string) =>
        v ? new Date(v).toLocaleString() : <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: '操作',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, r: CsAgent) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Popconfirm
            title="删除该智能客服？"
            description={r.boundWecomAppId ? '该 Agent 已绑定企微应用，请先解绑' : undefined}
            disabled={!!r.boundWecomAppId}
            onConfirm={() => remove.mutate(r.id)}
          >
            <Button danger size="small" icon={<DeleteOutlined />} disabled={!!r.boundWecomAppId}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const availableWecomApps = (wecomApps || []).filter(
    (w) => !w.csAgentId || w.csAgentId === drawer.editing?.id,
  );

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="在这里为租户创建多个「智能客服」，每个客服可以独立人设 / 问候语 / LLM 模型配置。"
        description="每个 Agent 最多绑定一个企微应用；消息路由时以绑定关系决定走哪个 Agent。"
      />

      <Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>
          新增智能客服
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns as any}
        dataSource={agents || []}
        pagination={false}
        scroll={{ x: 1200 }}
      />

      <Drawer
        title={drawer.editing ? `编辑：${drawer.editing.name}` : '新增智能客服'}
        width={600}
        open={drawer.open}
        onClose={() => setDrawer({ open: false, tab: 'basic' })}
        destroyOnClose
        footer={
          drawer.tab === 'basic' ? (
            <Space>
              <Button onClick={() => setDrawer({ open: false, tab: 'basic' })}>取消</Button>
              <Button type="primary" onClick={() => form.submit()} loading={save.isPending}>
                保存
              </Button>
            </Space>
          ) : null
        }
      >
        <Tabs
          activeKey={drawer.tab}
          onChange={(k) => setDrawer((d) => ({ ...d, tab: k as DrawerTab }))}
          items={[
            {
              key: 'basic',
              label: '基本信息',
              children: (
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={{ enabled: true }}
                  onFinish={(v) => {
                    const body: CsAgentBody = {};
                    Object.entries(v).forEach(([k, val]) => {
                      if (val === undefined) return;
                      if (typeof val === 'string' && val.trim() === '' && drawer.editing) {
                        (body as any)[k] = null;
                        return;
                      }
                      (body as any)[k] = val;
                    });
                    save.mutate(body);
                  }}
                >
                  <Form.Item label="名称" name="name" rules={[{ required: !drawer.editing, max: 64 }]}>
                    <Input placeholder="如：HR 助手" />
                  </Form.Item>
                  <Form.Item
                    label="Code（租户内唯一英文 slug）"
                    name="code"
                    rules={[
                      { required: !drawer.editing },
                      {
                        pattern: /^[a-z][a-z0-9_]{1,31}$/,
                        message: '小写字母开头，允许 a-z 0-9 _，2-32 位',
                      },
                    ]}
                    extra="示例：hr_bot / sales_bot；保存后不建议变更（会影响历史审计关联）。"
                  >
                    <Input placeholder="hr_bot" />
                  </Form.Item>
                  <Form.Item label="描述" name="description">
                    <Input placeholder="（可选）用于同事区分用途" maxLength={255} />
                  </Form.Item>
                  <Form.Item
                    label="人设提示词（Persona Prompt）"
                    name="personaPrompt"
                    extra="会被拼到 system prompt 的开头，覆盖全局 bot-name 描述。"
                  >
                    <Input.TextArea rows={4} placeholder="例：你是 Acme 的 HR 机器人，专门回答入职、假勤、社保相关问题。" />
                  </Form.Item>
                  <Form.Item
                    label="问候语（Greeting）"
                    name="greeting"
                    extra="首次被 @ 或 @bot 空内容时的引导语；为空则使用租户默认。"
                  >
                    <Input placeholder="您好～请告诉我您的具体问题，例如「怎么申请年假」" maxLength={255} />
                  </Form.Item>
                  <Form.Item
                    label="Chat 模型覆盖"
                    name="chatLlmConfigId"
                    extra="选择一个 purpose=chat 的 LLM 配置；留空则继承租户默认。"
                  >
                    <Select
                      allowClear
                      placeholder="（继承租户默认 chat 配置）"
                      options={chatConfigs.map((c) => ({
                        value: c.id,
                        label: `${c.provider} / ${c.model}${c.isDefault ? '（默认）' : ''}`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item label="头像 URL" name="avatarUrl">
                    <Input placeholder="https://..." maxLength={255} />
                  </Form.Item>
                  <Form.Item label="启用" name="enabled" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'content',
              label: '内容归属',
              disabled: !drawer.editing,
              children: drawer.editing ? (
                <ContentMappingPanel agent={drawer.editing} />
              ) : null,
            },
            {
              key: 'bind',
              label: '绑定企微应用',
              disabled: !drawer.editing,
              children: drawer.editing ? (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Alert
                    type="info"
                    showIcon
                    message="每个 Agent 最多绑定一个企微应用，一个企微应用也只能被一个 Agent 认领。"
                  />
                  {drawer.editing.boundWecomAppId ? (
                    <Alert
                      type="success"
                      icon={<LinkOutlined />}
                      message="当前绑定"
                      description={
                        <Space>
                          <Tag color="blue">{drawer.editing.boundWecomAppName}</Tag>
                          <Popconfirm
                            title="确认解绑？"
                            description="解绑后该企微应用将不再路由到此 Agent"
                            onConfirm={() =>
                              unbind.mutate({
                                agentId: drawer.editing!.id,
                                wecomAppId: drawer.editing!.boundWecomAppId!,
                              })
                            }
                          >
                            <Button size="small" icon={<DisconnectOutlined />} danger loading={unbind.isPending}>
                              解绑
                            </Button>
                          </Popconfirm>
                        </Space>
                      }
                    />
                  ) : (
                    <Alert type="warning" showIcon message="当前尚未绑定任何企微应用" />
                  )}

                  <Form
                    form={bindForm}
                    layout="vertical"
                    onFinish={(v) => {
                      if (!v.wecomAppId || !drawer.editing) return;
                      bind.mutate({ agentId: drawer.editing.id, wecomAppId: v.wecomAppId });
                    }}
                  >
                    <Form.Item
                      label="选择要绑定的企微应用"
                      name="wecomAppId"
                      rules={[{ required: true, message: '请选择' }]}
                      extra="只列出未被其他 Agent 占用的应用。"
                    >
                      <Select
                        placeholder="选择企微应用"
                        options={availableWecomApps.map((w) => ({
                          value: w.id,
                          label: `${w.name}（corp ${w.corpId.slice(0, 8)}… / agent ${w.agentId}）`,
                          disabled: !w.enabled,
                        }))}
                      />
                    </Form.Item>
                    <Button
                      type="primary"
                      icon={<LinkOutlined />}
                      loading={bind.isPending}
                      onClick={() => bindForm.submit()}
                    >
                      绑定
                    </Button>
                  </Form>
                </Space>
              ) : null,
            },
          ]}
        />
      </Drawer>
    </Space>
  );
}

function ContentMappingPanel({ agent }: { agent: CsAgent }) {
  const qc = useQueryClient();
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);

  const { data: mappedGroups, isLoading: loadingGroups } = useQuery({
    queryKey: ['cs-agent-mapping-groups', agent.id],
    queryFn: () => csAgentMappingApi.listFaqGroups(agent.id),
  });
  const { data: mappedDocs, isLoading: loadingDocs } = useQuery({
    queryKey: ['cs-agent-mapping-docs', agent.id],
    queryFn: () => csAgentMappingApi.listDocuments(agent.id),
  });
  const { data: allGroups } = useQuery({
    queryKey: ['faq-groups'],
    queryFn: () => faqGroupApi.list(),
  });
  const { data: allDocsPage } = useQuery({
    queryKey: ['kb-docs-all'],
    queryFn: () => docApi.list({ page: 1, size: 1000 }),
  });
  const allDocs = allDocsPage?.items || [];

  useEffect(() => {
    if (mappedGroups) setSelectedGroupIds(mappedGroups.map((m) => m.faqGroupId));
  }, [mappedGroups]);
  useEffect(() => {
    if (mappedDocs) setSelectedDocIds(mappedDocs.map((m) => m.kbDocumentId));
  }, [mappedDocs]);

  const saveGroups = useMutation({
    mutationFn: (ids: number[]) => csAgentMappingApi.replaceFaqGroups(agent.id, ids),
    onSuccess: () => {
      message.success('FAQ 分组映射已保存');
      qc.invalidateQueries({ queryKey: ['cs-agent-mapping-groups', agent.id] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '保存失败');
    },
  });

  const saveDocs = useMutation({
    mutationFn: (ids: number[]) => csAgentMappingApi.replaceDocuments(agent.id, ids),
    onSuccess: () => {
      message.success('文档映射已保存');
      qc.invalidateQueries({ queryKey: ['cs-agent-mapping-docs', agent.id] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message || '保存失败');
    },
  });

  const groupsUnrestricted = selectedGroupIds.length === 0;
  const docsUnrestricted = selectedDocIds.length === 0;

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="为该 Agent 指定能看到的 FAQ 分组 / 文档；两者都留空 = 不限制（能看到本租户全部）。"
        description="命中 FAQ 或知识库检索时会按此白名单过滤；清空并保存即可恢复无限制。"
      />

      <div>
        <Typography.Title level={5} style={{ marginBottom: 8 }}>
          可见 FAQ 分组
        </Typography.Title>
        {groupsUnrestricted ? (
          <Alert
            type="warning"
            showIcon
            message="当前未配置限制，Agent 能看到本租户全部 FAQ 分组"
            style={{ marginBottom: 12 }}
          />
        ) : (
          <Alert
            type="success"
            showIcon
            message={`已限制为 ${selectedGroupIds.length} 个分组`}
            style={{ marginBottom: 12 }}
          />
        )}
        {loadingGroups ? (
          <Empty description="加载中…" />
        ) : (
          <>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="选择可见的 FAQ 分组（留空 = 全部可见）"
              value={selectedGroupIds}
              onChange={setSelectedGroupIds}
              options={(allGroups || []).map((g) => ({
                value: g.id,
                label: `${g.name}（${g.faqCount}）`,
              }))}
              allowClear
              optionFilterProp="label"
            />
            <div style={{ marginTop: 12 }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saveGroups.isPending}
                onClick={() => saveGroups.mutate(selectedGroupIds)}
              >
                保存 FAQ 分组映射
              </Button>
            </div>
          </>
        )}
      </div>

      <div>
        <Typography.Title level={5} style={{ marginBottom: 8 }}>
          可见知识库文档
        </Typography.Title>
        {docsUnrestricted ? (
          <Alert
            type="warning"
            showIcon
            message="当前未配置限制，Agent 能看到本租户全部文档"
            style={{ marginBottom: 12 }}
          />
        ) : (
          <Alert
            type="success"
            showIcon
            message={`已限制为 ${selectedDocIds.length} 个文档`}
            style={{ marginBottom: 12 }}
          />
        )}
        {loadingDocs ? (
          <Empty description="加载中…" />
        ) : (
          <>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="选择可见的文档（留空 = 全部可见）"
              value={selectedDocIds}
              onChange={setSelectedDocIds}
              options={allDocs.map((d: any) => ({
                value: d.id,
                label: `${d.title}${d.status && d.status !== 'READY' ? `（${d.status}）` : ''}`,
              }))}
              allowClear
              optionFilterProp="label"
            />
            <div style={{ marginTop: 12 }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saveDocs.isPending}
                onClick={() => saveDocs.mutate(selectedDocIds)}
              >
                保存文档映射
              </Button>
            </div>
          </>
        )}
      </div>
    </Space>
  );
}
