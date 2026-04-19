import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Drawer, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { auditApi } from '@/api/endpoints';
import dayjs from 'dayjs';

export default function SessionsPage() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [groupId, setGroupId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [days, setDays] = useState(7);
  const [detail, setDetail] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['llm', page, size, groupId, status, days],
    queryFn: () => auditApi.listLlm({ page, size, groupId, status, days }),
  });

  const columns = [
    { title: '时间', dataIndex: 'createdAt', width: 160, render: (v: string) => v && dayjs(v).format('MM-DD HH:mm:ss') },
    { title: '群', dataIndex: 'groupId', width: 180, ellipsis: true },
    { title: '模型', dataIndex: 'model', width: 100 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={s === 'OK' ? 'green' : 'red'}>{s}</Tag>,
    },
    {
      title: '转人工', dataIndex: 'handoff', width: 90,
      render: (v: boolean) => (v ? <Tag color="orange">YES</Tag> : <Tag>NO</Tag>),
    },
    { title: '延迟', dataIndex: 'latencyMs', width: 100, render: (v: number) => `${v || 0} ms` },
    { title: '置信度', dataIndex: 'confidence', width: 100 },
    {
      title: '操作', width: 100,
      render: (_: any, r: any) => <Button size="small" onClick={() => setDetail(r)}>详情</Button>,
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space>
        <Input placeholder="群 ID" allowClear onChange={(e) => { setGroupId(e.target.value || undefined); setPage(1); }} style={{ width: 180 }} />
        <Select placeholder="状态" allowClear value={status} onChange={(v) => { setStatus(v); setPage(1); }}
          options={[{ value: 'OK', label: 'OK' }, { value: 'FAIL', label: 'FAIL' }]} style={{ width: 120 }} />
        <Select value={days} onChange={setDays} style={{ width: 120 }}
          options={[
            { value: 1, label: '今日' },
            { value: 7, label: '7 天' },
            { value: 30, label: '30 天' },
          ]} />
      </Space>
      <Table
        rowKey="id"
        size="small"
        loading={isLoading}
        columns={columns as any}
        dataSource={data?.items || []}
        pagination={{
          current: page, pageSize: size, total: data?.total || 0, showSizeChanger: true,
          onChange: (p, s) => { setPage(p); setSize(s); },
        }}
      />
      <Drawer title="会话详情" width={720} open={!!detail} onClose={() => setDetail(null)} destroyOnClose>
        {detail && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Typography.Text strong>ConversationID:</Typography.Text>
            <Typography.Text code>{detail.conversationId}</Typography.Text>
            <Typography.Text strong>Prompt</Typography.Text>
            <pre style={{ background: '#fafafa', padding: 12, whiteSpace: 'pre-wrap' }}>{detail.prompt}</pre>
            <Typography.Text strong>Response</Typography.Text>
            <pre style={{ background: '#fafafa', padding: 12, whiteSpace: 'pre-wrap' }}>{detail.response || '(空)'}</pre>
            <Typography.Text strong>References</Typography.Text>
            <pre style={{ background: '#fafafa', padding: 12 }}>{JSON.stringify(detail.referencesUsed || [], null, 2)}</pre>
            {detail.errorMsg && (
              <>
                <Typography.Text type="danger">Error</Typography.Text>
                <pre style={{ background: '#fff1f0', padding: 12 }}>{detail.errorMsg}</pre>
              </>
            )}
          </Space>
        )}
      </Drawer>
    </Space>
  );
}
