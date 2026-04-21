import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import {
  WecomMessageDetail,
  WecomMessageListItem,
  WecomMessageQuery,
  wecomAppApi,
  wecomMessageApi,
} from '@/api/endpoints';

const { RangePicker } = DatePicker;

const MSG_TYPES: { value: string; label: string }[] = [
  { value: 'text', label: 'text' },
  { value: 'image', label: 'image' },
  { value: 'voice', label: 'voice' },
  { value: 'video', label: 'video' },
  { value: 'file', label: 'file' },
  { value: 'link', label: 'link' },
  { value: 'event', label: 'event' },
];

const VERIFY_COLOR: Record<string, string> = {
  VERIFIED: 'green',
  REJECTED: 'red',
  UNKNOWN: 'default',
};

function parseNum(v: string | null): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export default function WecomMessagesPage() {
  const [sp, setSp] = useSearchParams();

  const filter = useMemo<WecomMessageQuery>(
    () => ({
      wecomAppId: parseNum(sp.get('wecomAppId')),
      chatId: sp.get('chatId') || undefined,
      fromUserid: sp.get('fromUserid') || undefined,
      msgType: sp.get('msgType') || undefined,
      from: sp.get('from') || undefined,
      to: sp.get('to') || undefined,
      mentionBotOnly: sp.get('mentionBotOnly') === '1',
      page: parseNum(sp.get('page')) || 1,
      size: parseNum(sp.get('size')) || 20,
    }),
    [sp],
  );

  const [detailId, setDetailId] = useState<number | null>(null);

  const patchFilter = (patch: Partial<WecomMessageQuery>) => {
    const next = new URLSearchParams(sp);
    const apply = (key: keyof WecomMessageQuery, value: unknown) => {
      if (value == null || value === '' || value === false) next.delete(key);
      else if (typeof value === 'boolean') next.set(key, value ? '1' : '0');
      else next.set(key, String(value));
    };
    if ('page' in patch) apply('page', patch.page);
    else next.set('page', '1');
    (Object.keys(patch) as (keyof WecomMessageQuery)[]).forEach((k) => {
      if (k !== 'page') apply(k, patch[k]);
    });
    setSp(next, { replace: true });
  };

  const appsQuery = useQuery({
    queryKey: ['wecom-apps-for-msg-filter'],
    queryFn: () => wecomAppApi.list(),
    staleTime: 60_000,
  });

  const listQuery = useQuery({
    queryKey: ['wecom-messages', filter],
    queryFn: () => wecomMessageApi.list(filter),
    placeholderData: (prev) => prev,
  });

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => (v ? dayjs(v).format('MM-DD HH:mm:ss') : '-'),
    },
    { title: '企微应用', dataIndex: 'wecomAppName', width: 140, render: (v?: string) => v || '-' },
    { title: '群 chatId', dataIndex: 'chatId', width: 160, ellipsis: true },
    { title: '用户', dataIndex: 'fromUserid', width: 120, ellipsis: true, render: (v?: string) => v || '-' },
    { title: '类型', dataIndex: 'msgType', width: 90 },
    {
      title: '内容预览',
      dataIndex: 'contentPreview',
      ellipsis: true,
      render: (v?: string) => v || <Typography.Text type="secondary">(无)</Typography.Text>,
    },
    {
      title: '@bot',
      dataIndex: 'mentionedBot',
      width: 60,
      render: (v: boolean) => (v ? <Tag color="blue">@</Tag> : <span>-</span>),
    },
    {
      title: '验签',
      dataIndex: 'verifyStatus',
      width: 90,
      render: (v: string) => <Tag color={VERIFY_COLOR[v] || 'default'}>{v}</Tag>,
    },
    {
      title: '操作',
      width: 80,
      render: (_: unknown, r: WecomMessageListItem) => (
        <Button size="small" type="link" onClick={() => setDetailId(r.id)}>
          详情
        </Button>
      ),
    },
  ];

  const rangeValue: [Dayjs | null, Dayjs | null] | null =
    filter.from || filter.to
      ? [filter.from ? dayjs(filter.from) : null, filter.to ? dayjs(filter.to) : null]
      : null;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space wrap>
        <Select
          style={{ width: 200 }}
          allowClear
          placeholder="企微应用"
          value={filter.wecomAppId}
          loading={appsQuery.isLoading}
          options={(appsQuery.data || []).map((a) => ({ value: a.id, label: a.name }))}
          onChange={(v) => patchFilter({ wecomAppId: v })}
        />
        <Input.Search
          allowClear
          placeholder="群 chatId 精确匹配"
          defaultValue={filter.chatId}
          style={{ width: 220 }}
          onSearch={(v) => patchFilter({ chatId: v || undefined })}
        />
        <Input.Search
          allowClear
          placeholder="用户 userid"
          defaultValue={filter.fromUserid}
          style={{ width: 180 }}
          onSearch={(v) => patchFilter({ fromUserid: v || undefined })}
        />
        <Select
          style={{ width: 140 }}
          allowClear
          placeholder="消息类型"
          value={filter.msgType}
          options={MSG_TYPES}
          onChange={(v) => patchFilter({ msgType: v })}
        />
        <RangePicker
          showTime
          value={rangeValue as any}
          onChange={(r) =>
            patchFilter({
              from: r?.[0] ? r[0].toISOString() : undefined,
              to: r?.[1] ? r[1].toISOString() : undefined,
            })
          }
        />
        <Checkbox
          checked={!!filter.mentionBotOnly}
          onChange={(e) => patchFilter({ mentionBotOnly: e.target.checked || undefined })}
        >
          仅看 @bot
        </Checkbox>
      </Space>

      <Table
        rowKey="id"
        size="small"
        loading={listQuery.isLoading}
        columns={columns as any}
        dataSource={listQuery.data?.items || []}
        pagination={{
          current: filter.page,
          pageSize: filter.size,
          total: listQuery.data?.total || 0,
          showSizeChanger: true,
          onChange: (p, s) => patchFilter({ page: p, size: s }),
        }}
      />

      <DetailDrawer id={detailId} onClose={() => setDetailId(null)} />
    </Space>
  );
}

function DetailDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const open = id != null;
  const { data, isFetching } = useQuery({
    queryKey: ['wecom-message-detail', id],
    queryFn: () => wecomMessageApi.detail(id!),
    enabled: open,
  });

  return (
    <Drawer
      title={data ? `消息详情 - ${data.msgId}` : '消息详情'}
      width={720}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      {isFetching && !data ? (
        <Spin />
      ) : data ? (
        <Tabs
          defaultActiveKey="overview"
          items={[
            { key: 'overview', label: '概览', children: <OverviewTab data={data} /> },
            { key: 'plain', label: '明文 XML', children: <PlainTab data={data} /> },
            { key: 'cipher', label: '原始密文', children: <CipherTab data={data} /> },
          ]}
        />
      ) : (
        <Empty />
      )}
    </Drawer>
  );
}

function OverviewTab({ data }: { data: WecomMessageDetail }) {
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Field label="msgId" value={data.msgId} copyable />
      <Field label="chatId" value={data.chatId} copyable />
      <Field label="fromUserid" value={data.fromUserid || '-'} />
      <Field label="msgType" value={data.msgType} />
      <Field label="createdAt" value={dayjs(data.createdAt).format('YYYY-MM-DD HH:mm:ss')} />
      <Field
        label="verifyStatus"
        value={<Tag color={VERIFY_COLOR[data.verifyStatus]}>{data.verifyStatus}</Tag>}
      />
      <Typography.Title level={5} style={{ marginTop: 12 }}>
        路由信息
      </Typography.Title>
      {data.wecomApp ? (
        <>
          <Field label="企微应用" value={data.wecomApp.name} />
          <Field label="corpId / agentId" value={`${data.wecomApp.corpId} / ${data.wecomApp.agentId}`} />
        </>
      ) : (
        <Typography.Text type="secondary">（默认租户兼容路径，无 wecomApp 绑定）</Typography.Text>
      )}
      {data.csAgent ? (
        <Field label="绑定 CS Agent" value={`${data.csAgent.name}（${data.csAgent.code}）`} />
      ) : null}
      <Typography.Title level={5} style={{ marginTop: 12 }}>
        命中情况
      </Typography.Title>
      <Field
        label="mentionedList"
        value={
          data.mentionedList && data.mentionedList.length > 0 ? (
            <Space wrap>
              {data.mentionedList.map((u) => (
                <Tag key={u}>{u}</Tag>
              ))}
            </Space>
          ) : (
            <Typography.Text type="secondary">-</Typography.Text>
          )
        }
      />
      {data.linkedSessionMsgId ? (
        <Alert
          type="info"
          showIcon
          message={
            <span>
              已定位到同 msgId 的 session_message 记录（id={data.linkedSessionMsgId}），
              可到会话审计页查看 Bot 回复链路。
            </span>
          }
        />
      ) : (
        <Alert type="warning" showIcon message="未找到匹配的 session_message；可能未进入会话流程或尚未持久化。" />
      )}
    </Space>
  );
}

function PlainTab({ data }: { data: WecomMessageDetail }) {
  const raw = data.raw || '';
  if (!raw) return <Empty description="raw 为空" />;
  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Space>
        <Button size="small" onClick={() => copy(raw)}>
          复制
        </Button>
      </Space>
      <pre
        style={{
          background: '#fafafa',
          padding: 12,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          maxHeight: '60vh',
          overflow: 'auto',
        }}
      >
        {raw}
      </pre>
    </Space>
  );
}

function CipherTab({ data }: { data: WecomMessageDetail }) {
  if (data.verifyStatus !== 'VERIFIED' || !data.encryptedPayload) {
    return <Empty description="仅 VERIFIED 的消息提供原始密文；当前记录无密文或为历史数据。" />;
  }
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Alert
        type="warning"
        showIcon
        message="原始密文在你不具备原始 AESKey 时仍可能敏感，导出或截图前请确认用途。"
      />
      <Field label="msgSignature" value={data.msgSignature || '-'} copyable />
      <Field label="timestamp" value={data.timestamp || '-'} copyable />
      <Field label="nonce" value={data.nonce || '-'} copyable />
      <Typography.Text strong>encryptedPayload</Typography.Text>
      <Space>
        <Button size="small" onClick={() => copy(data.encryptedPayload || '')}>
          复制
        </Button>
      </Space>
      <pre
        style={{
          background: '#fff7e6',
          padding: 12,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          maxHeight: '40vh',
          overflow: 'auto',
        }}
      >
        {data.encryptedPayload}
      </pre>
    </Space>
  );
}

function Field({
  label,
  value,
  copyable,
}: {
  label: string;
  value: React.ReactNode;
  copyable?: boolean;
}) {
  return (
    <Space align="start" style={{ width: '100%' }}>
      <Typography.Text strong style={{ width: 130, display: 'inline-block' }}>
        {label}
      </Typography.Text>
      {copyable && typeof value === 'string' ? (
        <Typography.Text copyable={{ text: value }}>{value}</Typography.Text>
      ) : (
        <span>{value}</span>
      )}
    </Space>
  );
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success('已复制');
  } catch {
    message.error('复制失败');
  }
}
