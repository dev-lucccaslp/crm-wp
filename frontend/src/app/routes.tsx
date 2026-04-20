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
import AdminPage from '../pages/AdminPage';
import SettingsPage from '../pages/SettingsPage';
import ContactsPage from '../pages/ContactsPage';
import ReportsPage from '../pages/ReportsPage';

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
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/billing" element={<BillingPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
