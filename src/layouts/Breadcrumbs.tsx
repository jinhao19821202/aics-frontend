import { Breadcrumb } from 'antd';
import { Link, useLocation } from 'react-router-dom';

interface Trail {
  group: string;
  leaf: string;
  path: string;
}

const TRAILS: Record<string, Trail> = {
  '/dashboard': { group: '仪表盘', leaf: '概览', path: '/dashboard' },
  '/kb/documents': { group: '知识库', leaf: '知识文档', path: '/kb/documents' },
  '/kb/faqs': { group: '知识库', leaf: 'FAQ', path: '/kb/faqs' },
  '/kb/playground': { group: '知识库', leaf: '召回调试', path: '/kb/playground' },
  '/llm-config': { group: '模型与参数', leaf: '模型配置', path: '/llm-config' },
  '/cs-agents': { group: '智能客服', leaf: '智能客服', path: '/cs-agents' },
  '/wecom-apps': { group: '智能客服', leaf: '企微应用', path: '/wecom-apps' },
  '/sessions': { group: '对话与客服', leaf: '会话审计', path: '/sessions' },
  '/wecom-messages': { group: '对话与客服', leaf: '企微消息', path: '/wecom-messages' },
  '/handoff': { group: '对话与客服', leaf: '人工转接', path: '/handoff' },
  '/group-mapping': { group: '对话与客服', leaf: '群映射', path: '/group-mapping' },
  '/sensitive': { group: '安全与合规', leaf: '敏感词', path: '/sensitive' },
  '/admin-logs': { group: '安全与合规', leaf: '操作日志', path: '/admin-logs' },
  '/users': { group: '组织与权限', leaf: '用户', path: '/users' },
  '/roles': { group: '组织与权限', leaf: '角色', path: '/roles' },
  '/change-password': { group: '账号', leaf: '修改密码', path: '/change-password' },
};

export default function Breadcrumbs() {
  const location = useLocation();
  const trail = TRAILS[location.pathname];
  if (!trail) return null;
  return (
    <Breadcrumb
      style={{ fontSize: 13 }}
      items={[
        { title: <Link to="/dashboard">首页</Link> },
        { title: trail.group },
        { title: trail.leaf },
      ]}
    />
  );
}
