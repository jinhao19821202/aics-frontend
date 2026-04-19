import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import DocumentsPage from './pages/Documents';
import FaqPage from './pages/Faq';
import SessionsPage from './pages/Sessions';
import SensitivePage from './pages/Sensitive';
import UsersPage from './pages/Users';
import RolesPage from './pages/Roles';
import GroupMappingPage from './pages/GroupMapping';
import HandoffPage from './pages/Handoff';
import AdminLogsPage from './pages/AdminLogs';
import LlmConfigPage from './pages/LlmConfig';
import KbPlaygroundPage from './pages/KbPlayground';
import WecomAppsPage from './pages/WecomApps';
import CsAgentsPage from './pages/CsAgents';
import ChangePasswordPage from './pages/ChangePassword';
import { useAuth } from './store/auth';

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { accessToken, user } = useAuth();
  const location = useLocation();
  if (!accessToken) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/change-password"
        element={
          <RequireAuth>
            <ChangePasswordPage />
          </RequireAuth>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="kb/documents" element={<DocumentsPage />} />
        <Route path="kb/faqs" element={<FaqPage />} />
        <Route path="kb/playground" element={<KbPlaygroundPage />} />
        <Route path="wecom-apps" element={<WecomAppsPage />} />
        <Route path="cs-agents" element={<CsAgentsPage />} />
        <Route path="llm-config" element={<LlmConfigPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="handoff" element={<HandoffPage />} />
        <Route path="sensitive" element={<SensitivePage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="group-mapping" element={<GroupMappingPage />} />
        <Route path="admin-logs" element={<AdminLogsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
