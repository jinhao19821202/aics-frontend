import { useMemo } from 'react';
import { Layout, Menu, Dropdown, Avatar, Space, Typography, Tag } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  QuestionCircleOutlined,
  MessageOutlined,
  SolutionOutlined,
  SafetyOutlined,
  TeamOutlined,
  ApartmentOutlined,
  ClusterOutlined,
  AuditOutlined,
  LogoutOutlined,
  ExperimentOutlined,
  ApiOutlined,
  BookOutlined,
  CommentOutlined,
  ShopOutlined,
  SettingOutlined,
  LockOutlined,
  RobotOutlined,
  WechatOutlined,
} from '@ant-design/icons';
import type { ItemType } from 'antd/es/menu/interface';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import Breadcrumbs from './Breadcrumbs';

const { Sider, Content, Header } = Layout;

interface Leaf {
  key: string;
  label: string;
  icon: React.ReactNode;
  perm: string;
}

interface Group {
  key: string;
  label: string;
  icon: React.ReactNode;
  children: Leaf[];
}

const GROUPS: Group[] = [
  {
    key: 'grp:cs',
    label: '智能客服',
    icon: <RobotOutlined />,
    children: [
      { key: '/cs-agents', label: '智能客服', icon: <RobotOutlined />, perm: 'cs:agent:read' },
      { key: '/wecom-apps', label: '企微应用', icon: <WechatOutlined />, perm: 'wecom:app:manage' },
    ],
  },
  {
    key: 'grp:kb',
    label: '知识库',
    icon: <BookOutlined />,
    children: [
      { key: '/kb/documents', label: '知识文档', icon: <FileTextOutlined />, perm: 'kb:document:read' },
      { key: '/kb/faqs', label: 'FAQ', icon: <QuestionCircleOutlined />, perm: 'kb:faq:read' },
      { key: '/kb/playground', label: '召回调试', icon: <ExperimentOutlined />, perm: 'tenant:kb:read' },
    ],
  },
  {
    key: 'grp:dialog',
    label: '对话与客服',
    icon: <CommentOutlined />,
    children: [
      { key: '/sessions', label: '会话审计', icon: <MessageOutlined />, perm: 'audit:session:read' },
      { key: '/handoff', label: '人工转接', icon: <SolutionOutlined />, perm: 'handoff:manage' },
      { key: '/group-mapping', label: '群映射', icon: <ClusterOutlined />, perm: 'group:manage' },
    ],
  },
  {
    key: 'grp:model',
    label: '模型与参数',
    icon: <SettingOutlined />,
    children: [
      { key: '/llm-config', label: '模型配置', icon: <ApiOutlined />, perm: 'tenant:model:view' },
    ],
  },
  {
    key: 'grp:security',
    label: '安全与合规',
    icon: <LockOutlined />,
    children: [
      { key: '/sensitive', label: '敏感词', icon: <SafetyOutlined />, perm: 'sensitive:read' },
      { key: '/admin-logs', label: '操作日志', icon: <AuditOutlined />, perm: 'audit:session:read' },
    ],
  },
  {
    key: 'grp:org',
    label: '组织与权限',
    icon: <ShopOutlined />,
    children: [
      { key: '/users', label: '用户', icon: <TeamOutlined />, perm: 'user:manage' },
      { key: '/roles', label: '角色', icon: <ApartmentOutlined />, perm: 'user:manage' },
    ],
  },
];

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasAuthority, clear } = useAuth();

  const { items, openKeys, selectedKey } = useMemo(() => {
    const result: ItemType[] = [];
    if (hasAuthority('stats:read')) {
      result.push({
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: <Link to="/dashboard">仪表盘</Link>,
      });
    }
    for (const g of GROUPS) {
      const visibleChildren = g.children.filter((c) => hasAuthority(c.perm));
      if (visibleChildren.length === 0) continue;
      result.push({
        key: g.key,
        icon: g.icon,
        label: g.label,
        children: visibleChildren.map((c) => ({
          key: c.key,
          icon: c.icon,
          label: <Link to={c.key}>{c.label}</Link>,
        })),
      });
    }
    const matchedGroup = GROUPS.find((g) => g.children.some((c) => c.key === location.pathname));
    return {
      items: result,
      openKeys: matchedGroup ? [matchedGroup.key] : [],
      selectedKey: location.pathname,
    };
  }, [hasAuthority, location.pathname]);

  const dropdownItems = [
    {
      key: 'change-password',
      icon: <LockOutlined />,
      label: '修改密码',
      onClick: () => navigate('/change-password'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        clear();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="dark" breakpoint="lg">
        <div style={{ height: 48, margin: 12, color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          智能客服管理后台
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={openKeys}
          items={items}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Breadcrumbs />
          <Space size={12}>
            {user?.tenantName && (
              <Tag color="geekblue" style={{ marginRight: 4 }}>
                {user.tenantName}
              </Tag>
            )}
            <Dropdown menu={{ items: dropdownItems }}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar>{(user?.displayName || user?.username || 'U').slice(0, 1)}</Avatar>
                <Typography.Text>{user?.displayName || user?.username}</Typography.Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: 16, background: '#fff', padding: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
