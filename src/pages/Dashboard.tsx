import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Statistic, Tag, Typography, Space, Select } from 'antd';
import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { statsApi } from '@/api/endpoints';

export default function DashboardPage() {
  const [days, setDays] = useState(7);

  const summary = useQuery({ queryKey: ['stats:summary', days], queryFn: () => statsApi.summary(days) });
  const trend = useQuery({ queryKey: ['stats:trend', days], queryFn: () => statsApi.trend(days) });
  const circuit = useQuery({ queryKey: ['stats:circuit'], queryFn: statsApi.circuit, refetchInterval: 10000 });

  const s: any = summary.data || {};
  const t: any[] = trend.data || [];

  const chartOpt = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['总会话', '转人工'] },
    xAxis: { type: 'category', data: t.map((x) => x.date) },
    yAxis: { type: 'value' },
    series: [
      { name: '总会话', type: 'line', smooth: true, data: t.map((x) => x.total) },
      { name: '转人工', type: 'line', smooth: true, data: t.map((x) => x.handoff) },
    ],
  };

  const state = circuit.data?.state;
  const stateColor = state === 'CLOSED' ? 'green' : state === 'OPEN' ? 'red' : 'orange';

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space>
        <Typography.Text strong>统计周期：</Typography.Text>
        <Select value={days} onChange={setDays} style={{ width: 120 }}
          options={[
            { value: 1, label: '今日' },
            { value: 7, label: '7 天' },
            { value: 30, label: '30 天' },
          ]} />
        <Typography.Text type="secondary">熔断器：</Typography.Text>
        <Tag color={stateColor}>{state || '-'}</Tag>
        <Typography.Text type="secondary">成功 {circuit.data?.successful ?? 0} / 失败 {circuit.data?.failed ?? 0} / 慢 {circuit.data?.slow ?? 0}</Typography.Text>
      </Space>
      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="总会话" value={s.totalConversations || 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="机器人自助解决率" value={((s.resolveRate || 0) * 100).toFixed(1) + '%'} /></Card></Col>
        <Col span={6}><Card><Statistic title="转人工次数" value={s.handoffCount || 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="平均延迟 (ms)" value={s.avgLatencyMs || 0} /></Card></Col>
      </Row>
      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="P95 延迟 (ms)" value={s.p95LatencyMs || 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="Token 总数" value={s.totalTokens || 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="敏感命中" value={s.sensitiveHits || 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="自助解决" value={s.selfResolved || 0} /></Card></Col>
      </Row>
      <Card title="每日会话趋势"><ReactECharts option={chartOpt} style={{ height: 320 }} /></Card>
    </Space>
  );
}
