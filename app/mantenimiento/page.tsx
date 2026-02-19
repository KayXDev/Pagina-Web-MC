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
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-xl w-full bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-3">{t(lang, 'maintenance.title')}</h1>
        <p className="text-gray-300 whitespace-pre-wrap">{message}</p>
      </div>
    </div>
  );
}
