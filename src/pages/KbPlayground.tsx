import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Progress,
  Row,
  Select,
  Slider,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { docApi, playgroundApi, type PlaygroundCandidate, type PlaygroundResult } from '@/api/endpoints';

const DEFAULT_TOP_K = 5;
const DEFAULT_THRESHOLD = 0.5;

const rerankStatusTag: Record<string, { color: string; label: string }> = {
  ok: { color: 'green', label: '已启用' },
  failed: { color: 'volcano', label: '失败回退' },
  disabled: { color: 'default', label: '已禁用' },
  not_configured: { color: 'gold', label: '未配置' },
};

function parseCsvNumbers(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));
}

function parseCsvStrings(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export default function KbPlaygroundPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [topK, setTopK] = useState<number>(() => Number(searchParams.get('topK')) || DEFAULT_TOP_K);
  const [threshold, setThreshold] = useState<number>(() => {
    const t = Number(searchParams.get('threshold'));
    return Number.isFinite(t) && t > 0 ? t : DEFAULT_THRESHOLD;
  });
  const [docIds, setDocIds] = useState<number[]>(() => parseCsvNumbers(searchParams.get('docIds')));
  const [tags, setTags] = useState<string[]>(() => parseCsvStrings(searchParams.get('tags')));
  const [disableRerank, setDisableRerank] = useState<boolean>(searchParams.get('noRerank') === '1');
  const [lastRun, setLastRun] = useState<PlaygroundResult | null>(null);

  const docListQuery = useQuery({
    queryKey: ['kb-doc-list-all'],
    queryFn: () => docApi.list({ page: 1, size: 200 }),
    staleTime: 60_000,
  });

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    (docListQuery.data?.items ?? []).forEach((d: any) => (d.tags ?? []).forEach((t: string) => set.add(t)));
    return Array.from(set).sort().map((t) => ({ label: t, value: t }));
  }, [docListQuery.data]);

  const docOptions = useMemo(
    () =>
      (docListQuery.data?.items ?? []).map((d: any) => ({
        label: `${d.title ?? '未命名'} · #${d.id}`,
        value: d.id,
      })),
    [docListQuery.data],
  );

  useEffect(() => {
    const p = new URLSearchParams();
    if (query) p.set('q', query);
    if (topK !== DEFAULT_TOP_K) p.set('topK', String(topK));
    if (threshold !== DEFAULT_THRESHOLD) p.set('threshold', threshold.toFixed(2));
    if (docIds.length) p.set('docIds', docIds.join(','));
    if (tags.length) p.set('tags', tags.join(','));
    if (disableRerank) p.set('noRerank', '1');
    setSearchParams(p, { replace: true });
  }, [query, topK, threshold, docIds, tags, disableRerank, setSearchParams]);

  const searchMutation = useMutation({
    mutationFn: () =>
      playgroundApi.search({
        query: query.trim(),
        topK,
        threshold,
        docIds: docIds.length ? docIds : undefined,
        tags: tags.length ? tags : undefined,
        disableRerank: disableRerank || undefined,
      }),
    onSuccess: (res) => {
      setLastRun(res);
      if (res.errorMsg) message.warning(`检索返回错误：${res.errorMsg}`);
    },
    onError: (err: any) => {
      if (err?.response?.status === 429 || err?.code === 429) {
        message.error('调试频率过高，请稍后再试（每分钟 20 次）');
      }
    },
  });

  const run = () => {
    if (!query.trim()) {
      message.warning('请输入查询语句');
      return;
    }
    if (query.length > 500) {
      message.warning('查询长度不能超过 500 字');
      return;
    }
    searchMutation.mutate();
  };

  const scoreColor = (score: number) => {
    if (score >= 0.75) return '#52c41a';
    if (score >= 0.5) return '#1677ff';
    if (score >= 0.3) return '#faad14';
    return '#d9d9d9';
  };

  const columns: ColumnsType<PlaygroundCandidate> = [
    {
      title: '#',
      key: 'idx',
      width: 50,
      render: (_, __, idx) => <Tag color="blue">{idx + 1}</Tag>,
    },
    {
      title: '文档',
      key: 'doc',
      width: 240,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{r.docTitle || `#${r.docId}`}</Typography.Text>
          {r.docTags && r.docTags.length > 0 && (
            <Space size={4} wrap>
              {r.docTags.map((t) => (
                <Tag key={t} color="purple">
                  {t}
                </Tag>
              ))}
            </Space>
          )}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            chunkId={r.chunkId}
          </Typography.Text>
          <Button
            type="link"
            size="small"
            style={{ padding: 0 }}
            onClick={() => navigate(`/kb/documents?highlightDocId=${r.docId}`)}
          >
            在知识库中定位 →
          </Button>
        </Space>
      ),
    },
    {
      title: '内容',
      dataIndex: 'content',
      render: (v: string) => (
        <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }} ellipsis={{ rows: 4, expandable: true }}>
          {v}
        </Typography.Paragraph>
      ),
    },
    {
      title: '原始分',
      dataIndex: 'rawScore',
      width: 90,
      align: 'right',
      render: (v: number) => v.toFixed(4),
    },
    {
      title: '来源权重',
      dataIndex: 'sourceWeight',
      width: 90,
      align: 'right',
      render: (v: number) => v.toFixed(2),
    },
    {
      title: '精排分',
      dataIndex: 'rerankScore',
      width: 100,
      align: 'right',
      render: (v: number | null | undefined) =>
        v == null ? <Typography.Text type="secondary">—</Typography.Text> : v.toFixed(4),
    },
    {
      title: '最终分',
      dataIndex: 'finalScore',
      width: 160,
      render: (v: number) => (
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <Progress
            percent={Math.min(100, Math.round(v * 100))}
            size="small"
            strokeColor={scoreColor(v)}
            showInfo={false}
          />
          <Typography.Text strong style={{ color: scoreColor(v) }}>
            {v.toFixed(4)}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      align: 'center',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? '是' : '否'}</Tag>,
    },
  ];

  const rerankInfo = lastRun?.rerankStatus ? rerankStatusTag[lastRun.rerankStatus] : null;

  return (
    <>
      <Typography.Title level={4} style={{ margin: 0, marginBottom: 8 }}>
        召回调试
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        输入查询语句 → 返回向量检索 Top-K 候选及分项得分，用于验证知识库覆盖与阈值调优。
        支持按文档/标签筛选，或关闭精排（rerank）对比效果。每租户每用户每分钟限制 20 次。
      </Typography.Paragraph>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Form layout="vertical" onFinish={run}>
          <Form.Item label="查询语句" required>
            <Input.TextArea
              rows={2}
              maxLength={500}
              showCount
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="比如：发票开具流程是怎样的？"
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  run();
                }
              }}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="限定文档（docIds，最多 50）" style={{ marginBottom: 12 }}>
                <Select
                  mode="multiple"
                  allowClear
                  loading={docListQuery.isLoading}
                  value={docIds}
                  onChange={(v) => setDocIds(v.slice(0, 50))}
                  options={docOptions}
                  optionFilterProp="label"
                  placeholder="不选则检索全部文档"
                  maxTagCount={5}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="限定标签（tags，最多 20）" style={{ marginBottom: 12 }}>
                <Select
                  mode="tags"
                  allowClear
                  value={tags}
                  onChange={(v) => setTags(v.slice(0, 20))}
                  options={tagOptions}
                  placeholder="输入或选择文档 tag，空表示不限"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={9}>
              <Form.Item label={`Top-K · ${topK}`} style={{ marginBottom: 0 }}>
                <Row gutter={8} align="middle">
                  <Col flex="auto">
                    <Slider min={1} max={50} value={topK} onChange={setTopK} />
                  </Col>
                  <Col>
                    <InputNumber min={1} max={50} value={topK} onChange={(v) => v != null && setTopK(v)} />
                  </Col>
                </Row>
              </Form.Item>
            </Col>
            <Col span={9}>
              <Form.Item label={`相似度阈值 · ${threshold.toFixed(2)}`} style={{ marginBottom: 0 }}>
                <Row gutter={8} align="middle">
                  <Col flex="auto">
                    <Slider min={0} max={1} step={0.01} value={threshold} onChange={setThreshold} />
                  </Col>
                  <Col>
                    <InputNumber
                      min={0}
                      max={1}
                      step={0.05}
                      value={threshold}
                      onChange={(v) => v != null && setThreshold(v)}
                    />
                  </Col>
                </Row>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="关闭精排（对比用）" style={{ marginBottom: 0 }}>
                <Tooltip title="勾选后跳过 rerank，用于对比粗排结果">
                  <Switch checked={disableRerank} onChange={setDisableRerank} />
                </Tooltip>
              </Form.Item>
            </Col>
          </Row>
          <Row style={{ marginTop: 16 }}>
            <Col flex="auto" />
            <Col>
              <Space>
                <Button
                  onClick={() => {
                    setTopK(DEFAULT_TOP_K);
                    setThreshold(DEFAULT_THRESHOLD);
                    setDocIds([]);
                    setTags([]);
                    setDisableRerank(false);
                  }}
                >
                  重置参数
                </Button>
                <Button type="primary" onClick={run} loading={searchMutation.isPending}>
                  检索
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      {searchMutation.isPending && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin tip="检索中..." />
        </div>
      )}

      {lastRun && !searchMutation.isPending && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={5}>
              <Card size="small">
                <Statistic title="候选数" value={lastRun.candidates?.length || 0} suffix={`/ top-${lastRun.topK}`} />
              </Card>
            </Col>
            <Col span={5}>
              <Card size="small">
                <Statistic title="阈值" value={lastRun.threshold} precision={2} />
              </Card>
            </Col>
            <Col span={5}>
              <Card size="small">
                <Statistic title="耗时" value={lastRun.elapsedMs} suffix="ms" />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic
                  title="FAQ 命中"
                  value={lastRun.faqHit ? `#${lastRun.faqHit.faqId}` : '无'}
                  valueStyle={{ color: lastRun.faqHit ? '#52c41a' : undefined }}
                />
              </Card>
            </Col>
            <Col span={5}>
              <Card size="small">
                <Space direction="vertical" size={0}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    精排
                  </Typography.Text>
                  <Space>
                    {rerankInfo ? <Tag color={rerankInfo.color}>{rerankInfo.label}</Tag> : <Tag>—</Tag>}
                    {lastRun.rerankProvider && (
                      <Typography.Text style={{ fontSize: 12 }}>
                        {lastRun.rerankProvider}/{lastRun.rerankModel}
                      </Typography.Text>
                    )}
                  </Space>
                </Space>
              </Card>
            </Col>
          </Row>

          {lastRun.errorMsg && (
            <Alert type="error" showIcon style={{ marginBottom: 16 }} message={`检索异常：${lastRun.errorMsg}`} />
          )}

          {lastRun.rerankStatus === 'failed' && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="精排调用失败，已回退到粗排结果。请在 LLM 配置中检查 rerank 凭证或超时设置。"
            />
          )}

          {lastRun.faqHit && (
            <Card size="small" title="FAQ 命中详情" style={{ marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="问题">{lastRun.faqHit.question}</Descriptions.Item>
                <Descriptions.Item label="答案">
                  <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {lastRun.faqHit.answer}
                  </Typography.Paragraph>
                </Descriptions.Item>
                <Descriptions.Item label="得分">
                  <Tag color="green">
                    {typeof lastRun.faqHit.confidence === 'number'
                      ? lastRun.faqHit.confidence.toFixed(4)
                      : '—'}
                  </Tag>
                </Descriptions.Item>
                {lastRun.faqHit.matchedBy && (
                  <Descriptions.Item label="命中方式">
                    <Tag
                      color={
                        lastRun.faqHit.matchedBy === 'exact'
                          ? 'blue'
                          : lastRun.faqHit.matchedBy === 'semantic'
                            ? 'purple'
                            : 'default'
                      }
                    >
                      {lastRun.faqHit.matchedBy}
                    </Tag>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          {lastRun.candidates && lastRun.candidates.length > 0 ? (
            <Table<PlaygroundCandidate>
              rowKey="chunkId"
              size="middle"
              dataSource={lastRun.candidates}
              columns={columns}
              pagination={false}
              scroll={{ x: 1200 }}
            />
          ) : (
            !lastRun.errorMsg && <Empty description="无候选（阈值过高或知识库为空）" />
          )}
        </>
      )}
    </>
  );
}
