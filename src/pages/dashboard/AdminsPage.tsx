import { useState } from 'react';
import { ShieldAlert, UserPlus } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/features/auth/useAuth';
import { AdminsService } from '@/features/admin/AdminsService';
import { AppError } from '@/lib/errors';
import { Role, ROLE_LABELS } from '@/types/enums';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ForbiddenState } from '@/components/common/ForbiddenState';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Field } from '@/components/ui/Field';

export function AdminsPage() {
  const { can } = useAuth();
  const { data, loading, error, reload } = useAsync(() => AdminsService.list(), []);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(Role.VIEWER);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // La gestion des rôles est strictement réservée au SUPER_ADMIN
  // (doublée côté serveur : les RPC refusent tout autre rôle).
  if (!can('admins:manage')) return <ForbiddenState />;

  const run = async (fn: () => Promise<unknown>, okMessage: string) => {
    setActionError(null);
    setNotice(null);
    setBusy(true);
    try {
      await fn();
      setNotice(okMessage);
      reload();
    } catch (e) {
      setActionError(e instanceof AppError ? e.userMessage : 'Action impossible.');
    } finally {
      setBusy(false);
    }
  };

  const onGrant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    void run(
      () => AdminsService.grantByEmail(email.trim(), role),
      `Rôle ${ROLE_LABELS[role]} attribué à ${email.trim()}.`,
    );
    setEmail('');
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Administrateurs</h1>
        <p className="mt-1 text-sm text-slate-600">
          Attribution des rôles. L'utilisateur doit déjà posséder un compte
          (Supabase Auth) pour recevoir un rôle.
        </p>
      </header>

      <Alert tone="warning" title="Opération sensible">
        Seul un SUPER_ADMIN peut modifier les rôles — cette règle est appliquée
        côté serveur, pas seulement dans l'interface. Le dernier SUPER_ADMIN ne
        peut pas être retiré.
      </Alert>

      {actionError && <Alert tone="error">{actionError}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <Card>
        <CardContent className="p-5">
          <form onSubmit={onGrant} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <Field label="Email du compte" required>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  type="email"
                  value={email}
                  aria-describedby={describedBy}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="personne@exemple.com"
                />
              )}
            </Field>
            <Field label="Rôle">
              {({ id }) => (
                <Select id={id} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  {Object.values(Role).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Button type="submit" loading={busy}>
              <UserPlus className="h-4 w-4" /> Attribuer
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading && <LoadingState label="Chargement des comptes…" />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (data?.length ?? 0) === 0 && (
        <EmptyState
          title="Aucun compte avec rôle"
          description="Attribuez un premier rôle via le formulaire ci-dessus."
        />
      )}

      {!loading &&
        !error &&
        (data ?? []).map((u) => (
          <Card key={u.user_id}>
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{u.email}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {u.roles.map((r) => (
                    <Badge key={r} tone={r === Role.SUPER_ADMIN ? 'brand' : 'neutral'}>
                      {ROLE_LABELS[r] ?? r}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {u.roles.map((r) => (
                  <Button
                    key={r}
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => AdminsService.revoke(u.user_id, r),
                        `Rôle ${ROLE_LABELS[r] ?? r} retiré.`,
                      )
                    }
                  >
                    <ShieldAlert className="h-4 w-4" /> Retirer {ROLE_LABELS[r] ?? r}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
