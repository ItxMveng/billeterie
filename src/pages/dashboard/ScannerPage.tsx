import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle2, XCircle, AlertTriangle, Camera, CameraOff } from 'lucide-react';
import { CheckinService, type CheckinResponse } from '@/features/checkin/CheckinService';
import { extractToken, presentCheckin } from '@/features/checkin/checkin.logic';
import { PARTICIPANT_TYPE_LABELS } from '@/types/enums';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

const REGION_ID = 'qr-reader-region';
const RESULT_MS = 2500;
const SAME_TOKEN_COOLDOWN_MS = 3000;

/** Retour sensoriel optionnel (jamais bloquant s'il est indisponible). */
function feedback(ok: boolean) {
  try {
    navigator.vibrate?.(ok ? 80 : [60, 40, 60]);
  } catch {
    /* ignore */
  }
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ok ? 880 : 220;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    osc.onended = () => ctx.close();
  } catch {
    /* ignore */
  }
}

export function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinResponse | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const lastTokenRef = useRef<{ token: string; at: number }>({ token: '', at: 0 });

  const handleDecoded = useCallback(async (decoded: string) => {
    const token = extractToken(decoded);
    if (!token) return;
    const now = Date.now();
    // Verrou anti double-lecture (le serveur reste la vraie protection).
    if (processingRef.current) return;
    if (token === lastTokenRef.current.token && now - lastTokenRef.current.at < SAME_TOKEN_COOLDOWN_MS) {
      return;
    }
    processingRef.current = true;
    lastTokenRef.current = { token, at: now };

    try {
      const res = await CheckinService.validate(token);
      setResult(res);
      feedback(res.result === 'VALID');
    } catch (e) {
      logger.reportError(e instanceof AppError ? e : new AppError('UNKNOWN', { cause: e }), {
        scope: 'ScannerPage.validate',
      });
      setResult({ result: 'ERROR' });
      feedback(false);
    } finally {
      window.setTimeout(() => {
        setResult(null);
        processingRef.current = false;
      }, RESULT_MS);
    }
  }, []);

  const start = useCallback(async () => {
    setCamError(null);
    try {
      const scanner = new Html5Qrcode(REGION_ID, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => void handleDecoded(decodedText),
        () => {
          /* échecs de décodage image par image : ignorés */
        },
      );
      setScanning(true);
    } catch (e) {
      logger.error('Scanner start failed', { cause: e });
      setCamError(
        "Impossible d'accéder à la caméra. Autorisez l'accès et réessayez " +
          '(HTTPS requis sur mobile).',
      );
      scannerRef.current = null;
    }
  }, [handleDecoded]);

  const stop = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.stop();
      await scanner.clear();
    } catch {
      /* déjà arrêté */
    }
    scannerRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      // Nettoyage à la sortie de la page.
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => undefined);
        scannerRef.current = null;
      }
    };
  }, []);

  const presentation = result ? presentCheckin(result.result) : null;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Scanner</h1>
        <p className="mt-1 text-sm text-slate-600">
          Placez le QR du billet dans le cadre. Le contrôle est validé côté serveur.
        </p>
      </header>

      {camError && <Alert tone="error">{camError}</Alert>}

      <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-black">
        <div id={REGION_ID} className="min-h-[260px] w-full" />

        {/* Overlay du résultat */}
        {presentation && (
          <div
            role="alert"
            aria-live="assertive"
            className={
              'absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-white ' +
              (presentation.tone === 'success'
                ? 'bg-green-600/95'
                : presentation.tone === 'warning'
                  ? 'bg-amber-600/95'
                  : 'bg-red-600/95')
            }
          >
            {presentation.tone === 'success' ? (
              <CheckCircle2 className="h-16 w-16" aria-hidden="true" />
            ) : presentation.tone === 'warning' ? (
              <AlertTriangle className="h-16 w-16" aria-hidden="true" />
            ) : (
              <XCircle className="h-16 w-16" aria-hidden="true" />
            )}
            <p className="text-xl font-bold">{presentation.label}</p>
            {result?.first_name && (
              <p className="text-lg">
                {result.first_name} {result.last_name}
              </p>
            )}
            {result?.participant_type && (
              <p className="text-sm opacity-90">
                {PARTICIPANT_TYPE_LABELS[result.participant_type]}
                {result.school_name ? ` — ${result.school_name}` : ''}
              </p>
            )}
            {result?.ticket_number && (
              <p className="font-mono text-sm opacity-90">{result.ticket_number}</p>
            )}
            {result?.result === 'ALREADY_USED' && result.first_checkin_at && (
              <p className="text-xs opacity-90">
                1er passage : {new Date(result.first_checkin_at).toLocaleString('fr-FR')}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-center">
        {scanning ? (
          <Button variant="outline" onClick={() => void stop()}>
            <CameraOff className="h-4 w-4" /> Arrêter
          </Button>
        ) : (
          <Button onClick={() => void start()}>
            <Camera className="h-4 w-4" /> Démarrer le scanner
          </Button>
        )}
      </div>

      <p className="text-center text-xs text-slate-400">
        Astuce : installez l'application (PWA) sur le téléphone de l'agent pour un
        accès rapide le jour J.
      </p>
    </div>
  );
}
