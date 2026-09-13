import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from './auth-context';
import { ProtectedRoute } from './ProtectedRoute';
import { hasPermission, type Permission } from './rbac';
import { Role } from '@/types/enums';

function makeAuth(overrides: Partial<AuthContextValue>): AuthContextValue {
  const roles = overrides.roles ?? [];
  return {
    loading: false,
    session: null,
    user: null,
    roles,
    isAuthenticated: false,
    configured: true,
    can: (p: Permission) => hasPermission(roles, p),
    signIn: async () => {},
    signOut: async () => {},
    ...overrides,
  };
}

function renderWithAuth(auth: AuthContextValue, permission?: Permission) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>PAGE LOGIN</div>} />
          <Route path="/dashboard" element={<ProtectedRoute permission={permission} />}>
            <Route index element={<div>CONTENU PROTÉGÉ</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('ProtectedRoute — sécurité', () => {
  it('redirige un utilisateur NON authentifié vers /login', () => {
    renderWithAuth(makeAuth({ isAuthenticated: false }), 'dashboard:access');
    expect(screen.getByText('PAGE LOGIN')).toBeInTheDocument();
    expect(screen.queryByText('CONTENU PROTÉGÉ')).not.toBeInTheDocument();
  });

  it('affiche « accès refusé » si le rôle est insuffisant', () => {
    // VIEWER authentifié mais sans la permission admins:manage.
    renderWithAuth(
      makeAuth({ isAuthenticated: true, roles: [Role.VIEWER] }),
      'admins:manage',
    );
    expect(screen.getByText('Accès refusé')).toBeInTheDocument();
    expect(screen.queryByText('CONTENU PROTÉGÉ')).not.toBeInTheDocument();
  });

  it('laisse passer un utilisateur autorisé', () => {
    renderWithAuth(
      makeAuth({ isAuthenticated: true, roles: [Role.SUPER_ADMIN] }),
      'admins:manage',
    );
    expect(screen.getByText('CONTENU PROTÉGÉ')).toBeInTheDocument();
  });

  it('attend la résolution de la session (état loading)', () => {
    renderWithAuth(makeAuth({ loading: true }), 'dashboard:access');
    expect(screen.queryByText('CONTENU PROTÉGÉ')).not.toBeInTheDocument();
    expect(screen.queryByText('PAGE LOGIN')).not.toBeInTheDocument();
  });
});
