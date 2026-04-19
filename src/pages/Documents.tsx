import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Popconfirm, Space, Table, Tag, Upload, message } from 'antd';
import { UploadOutlined, ReloadOutlined, DeleteOutlined, ExperimentOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { docApi } from '@/api/endpoints';
import dayjs from 'dayjs';

export default function DocumentsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);

  const highlightDocId = useMemo(() => {
    const v = searchParams.get('highlightDocId');
    const n = v ? Number.parseInt(v, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['docs', page, size],
    queryFn: () => docApi.list({ page, size }),
  });

  useEffect(() => {
    if (!highlightDocId) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      params.delete('highlightDocId');
      setSearchParams(params, { replace: true });
    }, 5000);
    return () => clearTimeout(t);
  }, [highlightDocId, searchParams, setSearchParams]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return docApi.upload(fd);
    },
    onSuccess: () => {
      message.success('上传成功，正在后台解析');
      qc.invalidateQueries({ queryKey: ['docs'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => docApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs'] }),
  });

  const retry = useMutation({
    mutationFn: (id: number) => docApi.retry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs'] }),
  });

  const uploadProps: UploadProps = {
    beforeUpload: (f) => {
      uploadMutation.mutate(f);
      return false;
    },
    showUploadList: false,
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '标题', dataIndex: 'title' },
    {
      title: '标签',
      dataIndex: 'tags',
      width: 200,
      render: (tags?: string[]) =>
        tags && tags.length ? (
          <Space size={4} wrap>
            {tags.map((t) => (
              <Tag key={t} color="purple">
                {t}
              </Tag>
            ))}
          </Space>
        ) : (
          <span style={{ color: '#bbb' }}>—</span>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => {
        const map: any = { parsing: 'processing', ready: 'success', failed: 'error' };
        return <Tag color={map[s] || 'default'}>{s}</Tag>;
      },
    },
    { title: '分片数', dataIndex: 'chunkCount', width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', render: (v: string) => v && dayjs(v).format('YYYY-MM-DD HH:mm') },
    {
      title: '操作',
      width: 280,
      render: (_: any, r: any) => (
        <Space>
          {r.status === 'ready' && (
            <Button
              size="small"
              icon={<ExperimentOutlined />}
              onClick={() => navigate(`/kb/playground?docIds=${r.id}`)}
            >
              测试召回
            </Button>
          )}
          {r.status === 'failed' && (
            <Button size="small" icon={<ReloadOutlined />} onClick={() => retry.mutate(r.id)}>
              重试
            </Button>
          )}
          <Popconfirm title="确认删除该文档及其向量？" onConfirm={() => remove.mutate(r.id)}>
            <Button danger size="small" icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space>
        <Upload {...uploadProps}>
          <Button type="primary" icon={<UploadOutlined />} loading={uploadMutation.isPending}>
            上传文档 (PDF / DOCX / TXT / MD)
          </Button>
        </Upload>
      </Space>
      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns as any}
        dataSource={data?.items || []}
        rowClassName={(r: any) => (highlightDocId && r.id === highlightDocId ? 'aics-highlight-row' : '')}
        pagination={{
          current: page,
          pageSize: size,
          total: data?.total || 0,
          showSizeChanger: true,
          onChange: (p, s) => {
            setPage(p);
            setSize(s);
          },
        }}
      />
    </Space>
  );
}
