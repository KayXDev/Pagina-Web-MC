import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';
import { cookies } from 'next/headers';
import { getLangFromCookieStore, t } from '@/lib/i18n';

export default async function MantenimientoPage() {
  const lang = getLangFromCookieStore(cookies());
  await dbConnect();

  const messageSetting = await Settings.findOne({ key: 'maintenance_message' });
  const message = messageSetting?.value || t(lang, 'maintenance.defaultMessage');

  return (
    <div className="min-h-screen px-6 py-20 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-white/10 bg-gray-950/25 overflow-hidden">
          <div className="px-6 py-5 border-b border-white/10 bg-gray-950/30">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-white font-bold">
                !
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-white truncate">{t(lang, 'maintenance.title')}</h1>
                <p className="text-gray-400 text-sm md:text-base">
                  {lang === 'es' ? 'Volvemos pronto' : 'We\'ll be back soon'}
                </p>
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-600/15 text-yellow-400 border border-white/10">
                  {lang === 'es' ? 'Mantenimiento' : 'Maintenance'}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{message}</p>

            <div className="mt-6 text-xs text-gray-500">
              {lang === 'es'
                ? 'Puedes recargar esta página en unos minutos.'
                : 'You can refresh this page in a few minutes.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
