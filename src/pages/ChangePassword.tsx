import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/endpoints';
import { useAuth } from '@/store/auth';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, patchUser, clear } = useAuth();
  const [loading, setLoading] = useState(false);
  const mustChange = !!user?.mustChangePassword;

  const onFinish = async (values: { oldPassword: string; newPassword: string; confirm: string }) => {
    if (values.newPassword !== values.confirm) {
      message.warning('两次输入的新密码不一致');
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(values.oldPassword, values.newPassword);
      patchUser({ mustChangePassword: false });
      message.success('密码已更新');
      navigate('/dashboard', { replace: true });
    } catch {
      /* interceptor toasted */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F7FB' }}>
      <Card style={{ width: 420 }}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          {mustChange ? '首次登录 · 请修改密码' : '修改密码'}
        </Typography.Title>
        {mustChange && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="为了账号安全，系统要求你设置一个新的密码后再使用后台。"
          />
        )}
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item label="当前密码" name="oldPassword" rules={[{ required: true, message: '请输入当前密码' }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '密码至少 8 位' },
              {
                pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                message: '需同时包含字母与数字',
              },
            ]}
            extra="建议混合字母、数字与符号；长度 ≥ 8"
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item label="重复新密码" name="confirm" rules={[{ required: true, message: '请再次输入新密码' }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            保存并继续
          </Button>
          {!mustChange && (
            <Button block style={{ marginTop: 8 }} onClick={() => navigate(-1)}>
              返回
            </Button>
          )}
          {mustChange && (
            <Button
              block
              type="link"
              style={{ marginTop: 8 }}
              onClick={() => {
                clear();
                navigate('/login', { replace: true });
              }}
            >
              换个账号登录
            </Button>
          )}
        </Form>
      </Card>
    </div>
  );
}
