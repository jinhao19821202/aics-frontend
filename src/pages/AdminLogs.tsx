import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input, Space, Table, Typography } from 'antd';
import { auditApi } from '@/api/endpoints';
import dayjs from 'dayjs';

export default function AdminLogsPage() {
  const [action, setAction] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', action, page, size],
    queryFn: () => auditApi.adminLogs({ action, page, size }),
  });

  const columns = [
    { title: '时间', dataIndex: 'createdAt', width: 160, render: (v: string) => v && dayjs(v).format('MM-DD HH:mm:ss') },
    { title: '账号', dataIndex: 'adminName', width: 120 },
    { title: '操作', dataIndex: 'action', width: 160 },
    { title: '资源类型', dataIndex: 'resourceType', width: 140 },
    { title: '资源', dataIndex: 'resourceId', width: 100 },
    { title: 'IP', dataIndex: 'ip', width: 140 },
    {
      title: '详情',
      render: (_: any, r: any) => (
        <Typography.Text copyable style={{ fontSize: 12 }}>
          {JSON.stringify({ before: r.beforeVal, after: r.afterVal })}
        </Typography.Text>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space>
        <Input placeholder="按 action 过滤" allowClear onChange={(e) => { setAction(e.target.value || undefined); setPage(1); }} style={{ width: 240 }} />
      </Space>
      <Table rowKey="id" size="small" loading={isLoading} columns={columns as any} dataSource={data?.items || []}
        pagination={{
          current: page, pageSize: size, total: data?.total || 0,
          onChange: (p, s) => { setPage(p); setSize(s); },
        }} />
    </Space>
  );
}
