import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Form, Input, Tag, Tooltip, message } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined, ShopOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { authApi } from '@/api/endpoints';
import { useAuth } from '@/store/auth';
import './Login.css';

const LAST_TENANT_KEY = 'cs-admin-last-tenant';

/** URL ?t= / 子域名 / localStorage 预填 tenantCode；URL > subdomain > localStorage。 */
function resolveInitialTenantCode(searchParams: URLSearchParams): { code: string; locked: boolean } {
  const fromUrl = searchParams.get('t');
  if (fromUrl && fromUrl.trim()) return { code: fromUrl.trim(), locked: true };
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const firstLabel = host.split('.')[0];
  if (firstLabel && firstLabel !== 'localhost' && firstLabel !== 'admin' && !/^\d/.test(firstLabel) && host.split('.').length >= 3) {
    return { code: firstLabel, locked: true };
  }
  const saved = typeof window !== 'undefined' ? localStorage.getItem(LAST_TENANT_KEY) : null;
  return { code: saved || '', locked: false };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setSession } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tenantName, setTenantName] = useState<string>('');
  const [briefLoading, setBriefLoading] = useState(false);

  const initial = useMemo(() => resolveInitialTenantCode(searchParams), [searchParams]);

  useEffect(() => {
    form.setFieldValue('tenantCode', initial.code);
    if (initial.code) void resolveBrief(initial.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.code]);

  const resolveBrief = async (code: string) => {
    if (!code || !code.trim()) {
      setTenantName('');
      return;
    }
    setBriefLoading(true);
    try {
      const r = await authApi.tenantBrief(code.trim());
      setTenantName(r?.name || '');
    } catch {
      setTenantName('');
    } finally {
      setBriefLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const tenantCode = (values.tenantCode || '').trim() || undefined;
      const resp: any = await authApi.login(tenantCode, values.username, values.password);
      setSession(resp.accessToken, resp.refreshToken, resp.user);
      message.success('登录成功');
      if (resp.user?.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch {
      /* interceptor toasted */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <aside className="login-brand">
          <svg className="deco deco-bubble bubble-lg" viewBox="0 0 160 130" aria-hidden="true">
            <path d="M20 18 Q20 0 40 0 H140 Q160 0 160 18 V80 Q160 98 140 98 H70 L45 122 L50 98 H40 Q20 98 20 80 Z" fill="#4F6EF7" />
            <circle cx="70" cy="50" r="6" fill="#ffffff" opacity=".85" />
            <circle cx="90" cy="50" r="6" fill="#ffffff" opacity=".85" />
            <circle cx="110" cy="50" r="6" fill="#ffffff" opacity=".85" />
          </svg>
          <svg className="deco deco-bubble bubble-md" viewBox="0 0 120 100" aria-hidden="true">
            <path d="M14 14 Q14 0 30 0 H106 Q120 0 120 14 V60 Q120 74 106 74 H40 L24 92 L28 74 H30 Q14 74 14 60 Z" fill="#3AD6BF" />
            <rect x="34" y="30" width="52" height="6" rx="3" fill="#ffffff" opacity=".85" />
            <rect x="34" y="44" width="36" height="6" rx="3" fill="#ffffff" opacity=".85" />
          </svg>
          <svg className="deco deco-bubble bubble-sm" viewBox="0 0 90 78" aria-hidden="true">
            <path d="M10 12 Q10 0 22 0 H80 Q90 0 90 12 V46 Q90 58 80 58 H34 L20 72 L24 58 H22 Q10 58 10 46 Z" fill="#1B1E52" />
            <circle cx="34" cy="30" r="3.5" fill="#3AD6BF" />
            <circle cx="48" cy="30" r="3.5" fill="#ffffff" opacity=".7" />
            <circle cx="62" cy="30" r="3.5" fill="#ffffff" opacity=".7" />
          </svg>
          <svg className="deco deco-spark spark-1" viewBox="0 0 40 40" aria-hidden="true">
            <path d="M20 2 L22 16 L36 20 L22 24 L20 38 L18 24 L4 20 L18 16 Z" fill="#6C5CE7" />
          </svg>
          <svg className="deco deco-spark spark-2" viewBox="0 0 40 40" aria-hidden="true">
            <path d="M20 4 L22 18 L34 20 L22 22 L20 36 L18 22 L6 20 L18 18 Z" fill="#F6A9A6" />
          </svg>
          <span className="glow glow-a" />
          <span className="glow glow-b" />

          <div className="brand-center">
            <svg viewBox="0 0 140 140" className="brand-mark" aria-hidden="true">
              <path d="M24 26 Q24 12 38 12 H104 Q118 12 118 26 V80 Q118 94 104 94 H66 L46 114 L50 94 H38 Q24 94 24 80 Z" fill="#1B1E52" />
              <circle cx="58" cy="52" r="7" fill="#3AD6BF" />
              <circle cx="84" cy="52" r="7" fill="#6C5CE7" />
              <rect x="56" y="70" width="30" height="5" rx="2.5" fill="#ffffff" />
              <circle cx="118" cy="26" r="7" fill="#3AD6BF" />
              <circle cx="118" cy="26" r="3" fill="#ffffff" />
            </svg>
            <h1 className="brand-title">智能客服管理系统</h1>
            <p className="brand-subtitle">AI · 知识库 · 人工协同</p>
          </div>
        </aside>

        <section className="login-form">
          <div className="login-form-inner">
            <h2 className="login-title">登录</h2>
            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              onFinish={onFinish}
              initialValues={{ tenantCode: initial.code, remember: true }}
            >
              <Form.Item
                label={
                  <span>
                    租户标识{' '}
                    {tenantName && (
                      <Tag color="cyan" style={{ marginLeft: 6 }}>
                        {tenantName}
                      </Tag>
                    )}
                  </span>
                }
                name="tenantCode"
                tooltip="多租户场景必填；默认租户可不填"
              >
                <Input
                  bordered={false}
                  className="underline-input"
                  prefix={<ShopOutlined style={{ color: '#9B9BB0' }} />}
                  placeholder={initial.locked ? '' : '例如 acme（可选）'}
                  disabled={initial.locked}
                  onBlur={(e) => resolveBrief(e.target.value)}
                  suffix={
                    briefLoading ? (
                      <Tooltip title="正在解析租户">
                        <span style={{ fontSize: 12, color: '#9B9BB0' }}>···</span>
                      </Tooltip>
                    ) : null
                  }
                />
              </Form.Item>

              <Form.Item
                label="账号"
                name="username"
                rules={[{ required: true, message: '请输入账号' }]}
              >
                <Input bordered={false} autoComplete="username" className="underline-input" />
              </Form.Item>

              <Form.Item
                label="密码"
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password
                  bordered={false}
                  autoComplete="current-password"
                  className="underline-input"
                  iconRender={(v) => (v ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                />
              </Form.Item>

              <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 16 }}>
                <Checkbox className="keep-logged">保持登录</Checkbox>
              </Form.Item>

              <Button type="primary" htmlType="submit" block className="login-btn" loading={loading}>
                登录
              </Button>

              <a className="forgot-link">忘记密码？</a>
            </Form>
          </div>
        </section>
      </div>
    </div>
  );
}
