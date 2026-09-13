import { Route, Routes } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { ProtectedRoute, RequirePermission } from '@/features/auth/ProtectedRoute';

import { LandingPage } from '@/pages/LandingPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { PortalPage } from '@/pages/PortalPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

import { DashboardHome } from '@/pages/dashboard/DashboardHome';
import { ParticipantsPage } from '@/pages/dashboard/ParticipantsPage';
import { VerificationPage } from '@/pages/dashboard/VerificationPage';
import { ImportsPage } from '@/pages/dashboard/ImportsPage';
import { SchoolsPage } from '@/pages/dashboard/SchoolsPage';
import { EventPage } from '@/pages/dashboard/EventPage';
import { PaymentsPage } from '@/pages/dashboard/PaymentsPage';
import { TicketsPage } from '@/pages/dashboard/TicketsPage';
import { ScannerPage } from '@/pages/dashboard/ScannerPage';
import { AdminsPage } from '@/pages/dashboard/AdminsPage';
import { SettingsPage } from '@/pages/dashboard/SettingsPage';

export function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="inscription" element={<RegisterPage />} />
        <Route path="mon-billet" element={<PortalPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />

      {/* Dashboard protégé (authentification + accès dashboard) */}
      <Route path="/dashboard" element={<ProtectedRoute permission="dashboard:access" />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route
            path="participants"
            element={
              <RequirePermission permission="participants:read">
                <ParticipantsPage />
              </RequirePermission>
            }
          />
          <Route
            path="verification"
            element={
              <RequirePermission permission="participants:write">
                <VerificationPage />
              </RequirePermission>
            }
          />
          <Route
            path="imports"
            element={
              <RequirePermission permission="participants:write">
                <ImportsPage />
              </RequirePermission>
            }
          />
          <Route
            path="ecoles"
            element={
              <RequirePermission permission="schools:read">
                <SchoolsPage />
              </RequirePermission>
            }
          />
          <Route
            path="evenement"
            element={
              <RequirePermission permission="events:read">
                <EventPage />
              </RequirePermission>
            }
          />
          <Route
            path="paiements"
            element={
              <RequirePermission permission="payments:read">
                <PaymentsPage />
              </RequirePermission>
            }
          />
          <Route
            path="billets"
            element={
              <RequirePermission permission="tickets:read">
                <TicketsPage />
              </RequirePermission>
            }
          />
          <Route
            path="scanner"
            element={
              <RequirePermission permission="checkin:operate">
                <ScannerPage />
              </RequirePermission>
            }
          />
          <Route
            path="administrateurs"
            element={
              <RequirePermission permission="admins:manage">
                <AdminsPage />
              </RequirePermission>
            }
          />
          <Route
            path="parametres"
            element={
              <RequirePermission permission="settings:manage">
                <SettingsPage />
              </RequirePermission>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
