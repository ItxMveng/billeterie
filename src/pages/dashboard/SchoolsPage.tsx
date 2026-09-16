import { useState } from 'react';
import { Plus, Save, X, Pencil, Trash2 } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/features/auth/useAuth';
import { SchoolService } from '@/features/schools/SchoolService';
import { AppError } from '@/lib/errors';
import type { SchoolRow } from '@/types/database';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Alert';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useToast } from '@/components/ui/useToast';

export function SchoolsPage() {
  const { can } = useAuth();
  const canWrite = can('schools:write');
  const { data, loading, error, reload } = useAsync(() => SchoolService.listAll(), []);

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editShort, setEditShort] = useState('');

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      reload();
    } catch (e) {
      toast.error(e instanceof AppError ? e.userMessage : 'Action impossible.');
    } finally {
      setBusy(null);
    }
  };

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    void run(
      'add',
      () => SchoolService.create({ name, short_name: shortName || null }),
      `« ${name.trim()} » ajoutée.`,
    ).then(() => {
      setName('');
      setShortName('');
    });
  };

  const startEdit = (s: SchoolRow) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditShort(s.short_name ?? '');
  };

  const saveEdit = (id: string) =>
    run(id, () => SchoolService.update(id, { name: editName.trim(), short_name: editShort.trim() || null }), 'Établissement mis à jour.')
      .then(() => setEditingId(null));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Écoles</h1>
        <p className="mt-1 text-sm text-slate-600">
          Établissements proposés aux anciens étudiants lors de l'inscription.
          Seules les écoles <strong>actives</strong> apparaissent dans le formulaire public.
        </p>
      </header>

      {!canWrite && (
        <Alert tone="warning">Consultation seule : ajout et modification réservés aux administrateurs.</Alert>
      )}

      {canWrite && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={onAdd} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
              <Field label="Nom de l'établissement" required>
                {({ id }) => (
                  <Input
                    id={id}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="École Nationale d'Ingénieurs de Brest"
                  />
                )}
              </Field>
              <Field label="Sigle" hint="Optionnel">
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="ENIB"
                  />
                )}
              </Field>
              <Button type="submit" loading={busy === 'add'}>
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading && <LoadingState label="Chargement des écoles…" />}
      {!loading && error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && (data?.length ?? 0) === 0 && (
        <EmptyState
          title="Aucune école"
          description="Ajoutez le premier établissement avec le formulaire ci-dessus."
        />
      )}

      {!loading && !error && (data?.length ?? 0) > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data!.map((s) => (
            <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-4">
              {editingId === s.id ? (
                <div className="space-y-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label="Nom"
                  />
                  <Input
                    value={editShort}
                    onChange={(e) => setEditShort(e.target.value)}
                    aria-label="Sigle"
                    placeholder="Sigle"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" loading={busy === s.id} onClick={() => void saveEdit(s.id)}>
                      <Save className="h-4 w-4" /> Enregistrer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" /> Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{s.name}</p>
                    {s.short_name && <p className="text-xs text-slate-500">{s.short_name}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={s.is_active ? 'green' : 'neutral'}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {canWrite && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(s)} aria-label={`Modifier ${s.name}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === s.id}
                          onClick={() =>
                            void run(
                              s.id,
                              () => SchoolService.update(s.id, { is_active: !s.is_active }),
                              s.is_active ? 'École désactivée.' : 'École activée.',
                            )
                          }
                        >
                          {s.is_active ? 'Désactiver' : 'Activer'}
                        </Button>
                        <ConfirmButton
                          confirmLabel="Supprimer définitivement"
                          loading={busy === s.id}
                          onConfirm={() =>
                            void run(s.id, () => SchoolService.remove(s.id), 'École supprimée.')
                          }
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Supprimer {s.name}</span>
                        </ConfirmButton>
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
