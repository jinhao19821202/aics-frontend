import { useMemo, useState } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { llmConfigApi, type LlmConfig, type LlmConfigBody, type LlmPurpose } from '@/api/endpoints';
import { useAuth } from '@/store/auth';

const CHAT_MODELS = ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-long'];
const EMBED_MODELS = ['text-embedding-v3', 'text-embedding-v2'];
const RERANK_MODELS = ['gte-rerank-v2', 'gte-rerank', 'bge-reranker-v2-m3'];

const PURPOSE_COLORS: Record<LlmPurpose, string> = {
  chat: 'geekblue',
  embedding: 'purple',
  rerank: 'magenta',
};

type PurposeFilter = 'all' | LlmPurpose;

export default function LlmConfigPage() {
  const qc = useQueryClient();
  const { hasAuthority } = useAuth();
  const canEdit = hasAuthority('tenant:model:config');

  const [editing, setEditing] = useState<LlmConfig | null>(null);
  const [creating, setCreating] = useState(false);
  const [purposeFilter, setPurposeFilter] = useState<PurposeFilter>('all');
  const [form] = Form.useForm<LlmConfigBody & { paramsRaw?: string }>();

  const { data = [], isLoading } = useQuery({
    queryKey: ['llm-configs'],
    queryFn: () => llmConfigApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (body: LlmConfigBody) => llmConfigApi.create(body),
    onSuccess: () => {
      message.success('已创建');
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['llm-configs'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: number; body: LlmConfigBody }) => llmConfigApi.update(args.id, args.body),
    onSuccess: () => {
      message.success('已更新');
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['llm-configs'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => llmConfigApi.remove(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['llm-configs'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: number) => llmConfigApi.test(id),
    onSuccess: (res) => {
      if (res.ok) message.success(`连通成功 · ${res.latencyMs} ms`);
      else message.error(`连通失败：${res.message}`);
      qc.invalidateQueries({ queryKey: ['llm-configs'] });
    },
  });

  const openCreate = () => {
    setCreating(true);
    form.resetFields();
    form.setFieldsValue({
      provider: 'dashscope',
      purpose: 'chat',
      model: 'qwen-plus',
      enabled: true,
      isDefault: false,
      paramsRaw: '',
    });
  };

  const openEdit = (row: LlmConfig) => {
    setEditing(row);
    form.setFieldsValue({
      provider: row.provider,
      purpose: row.purpose,
      baseUrl: row.baseUrl,
      model: row.model,
      embeddingDim: row.embeddingDim,
      isDefault: row.isDefault,
      enabled: row.enabled,
      paramsRaw: row.params && Object.keys(row.params).length > 0 ? JSON.stringify(row.params, null, 2) : '',
    });
  };

  const purpose = Form.useWatch('purpose', form) as LlmPurpose | undefined;

  const filtered = useMemo(
    () => (purposeFilter === 'all' ? data : data.filter((c) => c.purpose === purposeFilter)),
    [data, purposeFilter],
  );

  const rerankParamsHint = `{
  "topN": 5,
  "scoreFloor": 0.2,
  "timeoutMs": 3000
}`;

  const columns: ColumnsType<LlmConfig> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    {
      title: '用途',
      dataIndex: 'purpose',
      width: 110,
      render: (v: LlmPurpose) => <Tag color={PURPOSE_COLORS[v] ?? 'default'}>{v}</Tag>,
    },
    { title: '供应商', dataIndex: 'provider', width: 110 },
    { title: '模型', dataIndex: 'model', width: 170, render: (v) => <Typography.Text code>{v}</Typography.Text> },
    {
      title: 'API Key',
      dataIndex: 'apiKeyTail',
      width: 140,
      render: (v) => <Typography.Text type="secondary">••••••••{v}</Typography.Text>,
    },
    { title: 'Base URL', dataIndex: 'baseUrl', width: 240, render: (v) => v || <Typography.Text type="secondary">官方默认</Typography.Text> },
    { title: '向量维度', dataIndex: 'embeddingDim', width: 100, render: (v) => v || '-' },
    {
      title: '默认',
      dataIndex: 'isDefault',
      width: 80,
      render: (v: boolean) => (v ? <Tag color="gold">默认</Tag> : '-'),
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '上次测试',
      key: 'lastTest',
      width: 220,
      render: (_, r) => {
        if (!r.lastTestAt) return <Typography.Text type="secondary">未测试</Typography.Text>;
        const time = dayjs(r.lastTestAt).format('MM-DD HH:mm');
        return (
          <Space direction="vertical" size={0}>
            <Space>
              <Tag color={r.lastTestOk ? 'green' : 'red'}>{r.lastTestOk ? 'OK' : 'FAIL'}</Tag>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{time}</Typography.Text>
            </Space>
            {r.lastTestMsg && (
              <Tooltip title={r.lastTestMsg}>
                <Typography.Text ellipsis style={{ fontSize: 12, maxWidth: 200 }} type="secondary">
                  {r.lastTestMsg}
                </Typography.Text>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'ops',
      width: 200,
      fixed: 'right',
      render: (_, row) => (
        <Space>
          <Button
            size="small"
            loading={testMutation.isPending && testMutation.variables === row.id}
            onClick={() => testMutation.mutate(row.id)}
            disabled={!canEdit}
          >
            测试连通
          </Button>
          {canEdit && (
            <>
              <Button size="small" type="link" onClick={() => openEdit(row)}>
                编辑
              </Button>
              <Popconfirm title="确认删除？" onConfirm={() => removeMutation.mutate(row.id)}>
                <Button size="small" type="link" danger>
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const modalOpen = creating || !!editing;
  const modalTitle = creating ? '新建模型配置' : editing ? `编辑配置 · #${editing.id}` : '';
  const confirmLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Space style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          模型配置
        </Typography.Title>
        {canEdit && (
          <Button type="primary" onClick={openCreate}>
            新建配置
          </Button>
        )}
      </Space>
      <Typography.Paragraph type="secondary">
        每个租户可配置自有 DashScope / 兼容 OpenAI 的大模型 apiKey。<Typography.Text strong>chat</Typography.Text> 用于对话生成，
        <Typography.Text strong>embedding</Typography.Text> 用于知识库向量化，
        <Typography.Text strong>rerank</Typography.Text> 用于检索精排（P003 F005）。同一用途只允许一条记录设为默认。
        apiKey 服务端以 AES-GCM 加密存储，读取时只回显末 4 位。
      </Typography.Paragraph>
      <div style={{ marginBottom: 12 }}>
        <Segmented
          value={purposeFilter}
          onChange={(v) => setPurposeFilter(v as PurposeFilter)}
          options={[
            { label: '全部', value: 'all' },
            { label: 'chat', value: 'chat' },
            { label: 'embedding', value: 'embedding' },
            { label: 'rerank', value: 'rerank' },
          ]}
        />
      </div>
      <Table<LlmConfig>
        rowKey="id"
        size="middle"
        loading={isLoading}
        dataSource={filtered}
        columns={columns}
        scroll={{ x: 1500 }}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
      />

      <Modal
        title={modalTitle}
        open={modalOpen}
        onCancel={() => {
          setCreating(false);
          setEditing(null);
        }}
        onOk={() => form.submit()}
        okText="保存"
        cancelText="取消"
        confirmLoading={confirmLoading}
        destroyOnClose
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            const { paramsRaw, ...rest } = values;
            const body: LlmConfigBody = { ...rest };
            if (paramsRaw && paramsRaw.trim().length > 0) {
              try {
                const parsed = JSON.parse(paramsRaw);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                  body.params = parsed as Record<string, unknown>;
                } else {
                  message.error('参数必须是 JSON 对象');
                  return;
                }
              } catch (e) {
                message.error('参数 JSON 解析失败');
                return;
              }
            } else if (values.purpose === 'rerank') {
              body.params = {};
            }
            if (editing && body.apiKey === '') delete body.apiKey;
            if (editing) updateMutation.mutate({ id: editing.id, body });
            else createMutation.mutate(body);
          }}
        >
          <Form.Item label="用途" name="purpose" rules={[{ required: true, message: '请选择用途' }]}>
            <Select
              disabled={!!editing}
              options={[
                { value: 'chat', label: 'chat · 对话生成' },
                { value: 'embedding', label: 'embedding · 向量化' },
                { value: 'rerank', label: 'rerank · 检索精排' },
              ]}
            />
          </Form.Item>
          <Form.Item label="供应商" name="provider" initialValue="dashscope">
            <Input placeholder="dashscope / cohere / jina / bge ..." />
          </Form.Item>
          <Form.Item label="模型" name="model" rules={[{ required: true, message: '请填写模型名' }]}>
            <Select
              showSearch
              allowClear
              placeholder={
                purpose === 'embedding' ? 'text-embedding-v3' : purpose === 'rerank' ? 'gte-rerank-v2' : 'qwen-plus'
              }
              options={(
                purpose === 'embedding' ? EMBED_MODELS : purpose === 'rerank' ? RERANK_MODELS : CHAT_MODELS
              ).map((m) => ({
                value: m,
                label: m,
              }))}
            />
          </Form.Item>
          <Form.Item
            label={editing ? 'API Key（留空表示不变）' : 'API Key'}
            name="apiKey"
            rules={editing ? [] : [{ required: true, message: '请填写 API Key' }]}
          >
            <Input.Password autoComplete="new-password" placeholder="sk-xxx" />
          </Form.Item>
          <Form.Item
            label={purpose === 'rerank' ? 'Base URL（非 DashScope 必填）' : 'Base URL（可选）'}
            name="baseUrl"
            tooltip={
              purpose === 'rerank'
                ? 'DashScope 可留空（默认 https://dashscope.aliyuncs.com/api/v1）；Cohere/Jina/BGE 请填其 OpenAI 兼容端点。'
                : undefined
            }
          >
            <Input placeholder="https://dashscope.aliyuncs.com/api/v1" />
          </Form.Item>
          {purpose === 'embedding' && (
            <Form.Item
              label="向量维度"
              name="embeddingDim"
              rules={[{ required: true, message: 'embedding 必填向量维度' }]}
              tooltip="必须与知识库 Milvus 集合维度一致，修改后可能需要重建向量"
            >
              <InputNumber style={{ width: '100%' }} min={1} placeholder="1024" />
            </Form.Item>
          )}
          {purpose === 'rerank' && (
            <Form.Item
              label="精排参数（JSON，可选）"
              name="paramsRaw"
              tooltip="支持 topN（返回前 N，默认同 playground topK）、scoreFloor（低于此值丢弃）、timeoutMs（请求超时，500-30000）"
            >
              <Input.TextArea rows={5} placeholder={rerankParamsHint} style={{ fontFamily: 'monospace' }} />
            </Form.Item>
          )}
          <Space size="large">
            <Form.Item label="设为默认" name="isDefault" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch />
            </Form.Item>
            <Form.Item label="启用" name="enabled" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
