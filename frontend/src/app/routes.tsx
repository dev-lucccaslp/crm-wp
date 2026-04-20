import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';

import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import NewWorkspacePage from '../pages/NewWorkspacePage';
import AppShell from '../pages/AppShell';
import DashboardPage from '../pages/DashboardPage';
import KanbanPage from '../pages/KanbanPage';
import WhatsAppPage from '../pages/WhatsAppPage';
import ChatPage from '../pages/ChatPage';
import AutomationPage from '../pages/AutomationPage';
import BillingPage from '../pages/BillingPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  if (!user || !token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  if (token) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/signup"
        element={
          <RedirectIfAuthed>
            <SignupPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/workspaces/new"
        element={
          <RequireAuth>
            <NewWorkspacePage />
          </RequireAuth>
        }
      />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="kanban" element={<KanbanPage />} />
        <Route path="whatsapp" element={<WhatsAppPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="automations" element={<AutomationPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="settings/billing" element={<BillingPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
