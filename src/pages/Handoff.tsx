import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Popconfirm, Space, Table, Tag, message } from 'antd';
import { handoffApi } from '@/api/endpoints';
import dayjs from 'dayjs';

export default function HandoffPage() {
  const qc = useQueryClient();
  const [groupId, setGroupId] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ['handoff', groupId, page, size],
    queryFn: () => handoffApi.list({ groupId, page, size }),
  });

  const close = useMutation({
    mutationFn: (id: number) => handoffApi.close(id, 'MANUAL'),
    onSuccess: () => {
      message.success('已关闭');
      qc.invalidateQueries({ queryKey: ['handoff'] });
    },
  });

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '群', dataIndex: 'groupId', width: 200, ellipsis: true },
    { title: '触发原因', dataIndex: 'triggerReason', width: 160 },
    { title: '坐席', dataIndex: 'agentUserid', width: 140 },
    { title: '触发时间', dataIndex: 'triggeredAt', width: 160, render: (v: string) => v && dayjs(v).format('MM-DD HH:mm:ss') },
    {
      title: '状态',
      render: (_: any, r: any) => r.closedAt
        ? <Tag color="default">{r.closeReason}</Tag>
        : <Tag color="orange">ACTIVE</Tag>,
    },
    { title: '关闭时间', dataIndex: 'closedAt', width: 160, render: (v: string) => v && dayjs(v).format('MM-DD HH:mm:ss') },
    {
      title: '操作', width: 120,
      render: (_: any, r: any) => !r.closedAt && (
        <Popconfirm title="手动关闭人工会话？" onConfirm={() => close.mutate(r.id)}>
          <Button size="small" danger>关闭</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space>
        <Input placeholder="群 ID 过滤" allowClear onChange={(e) => { setGroupId(e.target.value || undefined); setPage(1); }} style={{ width: 220 }} />
      </Space>
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={data?.items || []}
        pagination={{
          current: page, pageSize: size, total: data?.total || 0,
          onChange: (p, s) => { setPage(p); setSize(s); },
        }} />
    </Space>
  );
}
