import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { FullPageLoader } from '@/components/common/FullPageLoader';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { ProtectedRoute, RequirePermission } from '@/features/auth/ProtectedRoute';

import { LandingPage } from '@/pages/LandingPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { PortalPage } from '@/pages/PortalPage';
import { LoginPage } from '@/pages/LoginPage';
import { SetPasswordPage } from '@/pages/SetPasswordPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

import { DashboardHome } from '@/pages/dashboard/DashboardHome';
import { StatisticsPage } from '@/pages/dashboard/StatisticsPage';
import { ParticipantsPage } from '@/pages/dashboard/ParticipantsPage';
import { ParticipantDetailPage } from '@/pages/dashboard/ParticipantDetailPage';
import { ExportsPage } from '@/pages/dashboard/ExportsPage';
import { AuditPage } from '@/pages/dashboard/AuditPage';
import { VerificationPage } from '@/pages/dashboard/VerificationPage';
import { ImportsPage } from '@/pages/dashboard/ImportsPage';
import { SchoolsPage } from '@/pages/dashboard/SchoolsPage';
import { EventPage } from '@/pages/dashboard/EventPage';
import { PaymentsPage } from '@/pages/dashboard/PaymentsPage';
import { TicketsPage } from '@/pages/dashboard/TicketsPage';
// Chargé à la demande : la librairie de scan QR est volumineuse et n'est
// utile qu'aux agents de contrôle (réduit le bundle initial pour tous).
const ScannerPage = lazy(() =>
  import('@/pages/dashboard/ScannerPage').then((m) => ({ default: m.ScannerPage })),
);
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
      <Route path="/definir-mot-de-passe" element={<SetPasswordPage />} />

      {/* Dashboard protégé (authentification + accès dashboard) */}
      <Route path="/dashboard" element={<ProtectedRoute permission="dashboard:access" />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route
            path="statistiques"
            element={
              <RequirePermission permission="dashboard:access">
                <StatisticsPage />
              </RequirePermission>
            }
          />
          <Route
            path="participants"
            element={
              <RequirePermission permission="participants:read">
                <ParticipantsPage />
              </RequirePermission>
            }
          />
          <Route
            path="participants/:id"
            element={
              <RequirePermission permission="participants:read">
                <ParticipantDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="exports"
            element={
              <RequirePermission permission="exports:read">
                <ExportsPage />
              </RequirePermission>
            }
          />
          <Route
            path="audit"
            element={
              <RequirePermission permission="audit:read">
                <AuditPage />
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
                <Suspense fallback={<FullPageLoader label="Chargement du scanner…" />}>
                  <ScannerPage />
                </Suspense>
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
