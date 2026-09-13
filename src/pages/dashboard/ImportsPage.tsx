import { useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { parseCsv, csvToRecords } from '@/lib/csv';
import {
  buildParticipantImport,
  buildVerificationImport,
} from '@/features/imports/import-mappers';
import { ImportService, type ImportSummary } from '@/features/imports/ImportService';
import { AppError } from '@/lib/errors';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ForbiddenState } from '@/components/common/ForbiddenState';

type Kind = 'PARTICIPANTS' | 'VERIFICATION';

interface Preview {
  rows: Array<Record<string, unknown>>;
  issues: Array<{ line: number; message: string }>;
  total: number;
  validCount: number;
}

export function ImportsPage() {
  const { can } = useAuth();
  const [kind, setKind] = useState<Kind>('PARTICIPANTS');
  const [filename, setFilename] = useState<string>('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!can('participants:write')) return <ForbiddenState />;

  const onFile = async (file: File) => {
    setError(null);
    setSummary(null);
    setPreview(null);
    setFilename(file.name);
    try {
      const text = await file.text();
      const records = csvToRecords(parseCsv(text));
      const built =
        kind === 'PARTICIPANTS'
          ? buildParticipantImport(records)
          : buildVerificationImport(records);
      setPreview({
        rows: built.rows as unknown as Array<Record<string, unknown>>,
        issues: built.issues,
        total: built.total,
        validCount: built.validCount,
      });
    } catch {
      setError('Impossible de lire ce fichier CSV.');
    }
  };

  const onConfirm = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const res =
        kind === 'PARTICIPANTS'
          ? await ImportService.importParticipants(preview.rows, filename)
          : await ImportService.importVerificationRecords(preview.rows, filename);
      setSummary(res);
      setPreview(null);
    } catch (e) {
      setError(e instanceof AppError ? e.userMessage : 'Import impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Import</h1>
        <p className="mt-1 text-sm text-slate-600">
          Prévisualisez toujours avant de confirmer. Les doublons (par email)
          sont ignorés automatiquement.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setKind('PARTICIPANTS'); setPreview(null); setSummary(null); }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${kind === 'PARTICIPANTS' ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Participants
            </button>
            <button
              onClick={() => { setKind('VERIFICATION'); setPreview(null); setSummary(null); }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${kind === 'VERIFICATION' ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Liste de vérification
            </button>
          </div>

          <div className="text-sm text-slate-600">
            {kind === 'PARTICIPANTS' ? (
              <p>
                Colonnes reconnues : <code>prenom, nom, email, telephone,
                categorie</code> (nouveau/ancien/autre), optionnelles{' '}
                <code>deja_paye, payment_required, school_id, identifiant</code>.
              </p>
            ) : (
              <p>
                Colonnes reconnues : <code>prenom, nom, email</code>,
                optionnelles <code>school_id, identifiant</code>.
              </p>
            )}
          </div>

          <label className="block">
            <span className="sr-only">Choisir un fichier CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-800 hover:file:bg-brand-100"
            />
          </label>
        </CardContent>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}

      {preview && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-semibold text-slate-900">Aperçu</h2>
              <Badge tone="neutral">{preview.total} lignes</Badge>
              <Badge tone="green">{preview.validCount} valides</Badge>
              {preview.issues.length > 0 && (
                <Badge tone="red">{preview.issues.length} en erreur</Badge>
              )}
            </div>

            {preview.issues.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <ul className="space-y-1">
                  {preview.issues.slice(0, 50).map((iss, i) => (
                    <li key={i}>Ligne {iss.line} : {iss.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              onClick={onConfirm}
              loading={busy}
              disabled={preview.validCount === 0}
            >
              Confirmer l'import de {preview.validCount} ligne(s)
            </Button>
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-semibold text-slate-900">Résultat de l'import</h2>
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">{summary.inserted} insérés</Badge>
              <Badge tone="amber">{summary.skipped} ignorés</Badge>
              <Badge tone="red">{summary.errors} erreurs</Badge>
            </div>
            {summary.tokens && summary.tokens.length > 0 && (
              <div>
                <p className="text-sm text-slate-600">
                  Liens privés générés (à distribuer aux participants) :
                </p>
                <textarea
                  readOnly
                  className="mt-2 h-40 w-full rounded-lg border border-slate-300 p-2 font-mono text-xs"
                  value={summary.tokens
                    .map(
                      (t) =>
                        `${t.email},${window.location.origin}/mon-billet?t=${t.access_token}`,
                    )
                    .join('\n')}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Ces liens ne sont affichés qu'une seule fois. Copiez-les
                  maintenant.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
