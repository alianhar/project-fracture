import { Link } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          Alat bantu riset — <strong className="text-text-muted">bukan alat diagnosis</strong> dan
          belum tersertifikasi untuk penggunaan klinis.{' '}
          <Link to={ROUTES.methodology} className="text-positive hover:underline">
            Baca metodologi & keterbatasan
          </Link>
          .
        </p>
        <p className="font-mono tabular-nums">Fracture.dx — platform riset tugas akhir</p>
      </div>
    </footer>
  );
}
