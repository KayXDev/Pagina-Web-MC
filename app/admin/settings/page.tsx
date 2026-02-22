'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Input, Textarea } from '@/components/ui';
import { FaCog } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getClientLangFromCookie, t, type Lang } from '@/lib/i18n';

export default function AdminMaintenancePage() {
  const [lang, setLang] = useState<Lang>('es');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    maintenance_mode: 'false',
    maintenance_message: 'Estamos en mantenimiento. Vuelve más tarde.',
    maintenance_paths: '',
    maintenance_discord_webhook: '',
  });

  const MAINTENANCE_ROUTE_OPTIONS: Array<{ path: string; labelKey: string }> = [
    { path: '/', labelKey: 'admin.settings.maintenanceRoute.home' },
    { path: '/tienda', labelKey: 'admin.settings.maintenanceRoute.shop' },
    { path: '/carrito', labelKey: 'admin.settings.maintenanceRoute.cart' },
    { path: '/noticias', labelKey: 'admin.settings.maintenanceRoute.news' },
    { path: '/foro', labelKey: 'admin.settings.maintenanceRoute.forum' },
    { path: '/soporte', labelKey: 'admin.settings.maintenanceRoute.support' },
    { path: '/perfil', labelKey: 'admin.settings.maintenanceRoute.profile' },
    { path: '/vote', labelKey: 'admin.settings.maintenanceRoute.vote' },
    { path: '/normas', labelKey: 'admin.settings.maintenanceRoute.rules' },
    { path: '/staff', labelKey: 'admin.settings.maintenanceRoute.staff' },
    { path: '/notificaciones', labelKey: 'admin.settings.maintenanceRoute.notifications' },
  ];

  const parseMaintenancePaths = (value: string) =>
    String(value || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

  const stringifyMaintenancePaths = (paths: string[]) => {
    const unique = Array.from(new Set(paths.map((p) => String(p || '').trim()).filter(Boolean)));
    unique.sort((a, b) => a.localeCompare(b));
    return unique.join('\n');
  };

  const selectedMaintenancePaths = new Set(parseMaintenancePaths(settings.maintenance_paths));

  const toggleMaintenancePath = (path: string) => {
    const next = new Set(selectedMaintenancePaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSettings({ ...settings, maintenance_paths: stringifyMaintenancePaths(Array.from(next)) });
  };

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (!response.ok) throw new Error(t(lang, 'admin.settings.loadError'));
      const data = await response.json();
      setSettings(prev => ({ ...prev, ...data }));
    } catch (error) {
      toast.error(t(lang, 'admin.settings.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error(t(lang, 'admin.settings.saveError'));

      const data = await response.json().catch(() => ({}));

      toast.success(t(lang, 'admin.settings.saveSuccess'));
      if (data?.webhookError) {
        toast.warn(`${t(lang, 'admin.settings.webhookWarn')}: ${data.webhookError}`);
      }
    } catch (error) {
      toast.error(t(lang, 'admin.settings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">{t(lang, 'admin.settings.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-gray-950/25 rounded-2xl" hover={false}>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-white">
            <FaCog />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent truncate">
              {t(lang, 'admin.settings.title')}
            </h1>
            <p className="text-gray-400 text-sm md:text-base">{t(lang, 'admin.settings.subtitle')}</p>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-white/10 bg-gray-950/25 rounded-2xl" hover={false}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <FaCog />
                <span>{t(lang, 'admin.settings.sectionTitle')}</span>
              </h2>
              <p className="text-gray-400 mt-2">{t(lang, 'admin.settings.sectionDesc')}</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={settings.maintenance_mode === 'true'}
                onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked ? 'true' : 'false' })}
              />
              <span className="text-gray-300 text-sm">{t(lang, 'admin.settings.enableMaintenance')}</span>
            </label>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">{t(lang, 'admin.settings.messageLabel')}</label>
            <Textarea
              rows={4}
              value={settings.maintenance_message}
              onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
              placeholder={t(lang, 'admin.settings.messagePlaceholder')}
            />
          </div>
        </Card>

        <Card className="border-white/10 bg-gray-950/25 rounded-2xl" hover={false}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="text-white font-semibold">{t(lang, 'admin.settings.maintenancePathsLabel')}</div>
            <div className="text-xs text-gray-400">{selectedMaintenancePaths.size} seleccionadas</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MAINTENANCE_ROUTE_OPTIONS.map((opt) => (
              <label
                key={opt.path}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={selectedMaintenancePaths.has(opt.path)}
                  onChange={() => toggleMaintenancePath(opt.path)}
                />
                <div className="min-w-0">
                  <div className="text-sm text-white font-medium truncate">{t(lang, opt.labelKey)}</div>
                  <div className="text-xs text-gray-400 truncate">{opt.path}</div>
                </div>
              </label>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-3">{t(lang, 'admin.settings.maintenancePathsHint')}</p>
        </Card>

        <Card className="border-white/10 bg-gray-950/25 rounded-2xl" hover={false}>
          <div className="text-white font-semibold mb-2">{t(lang, 'admin.settings.webhookLabel')}</div>
          <Input
            type="text"
            value={settings.maintenance_discord_webhook}
            onChange={(e) => setSettings({ ...settings, maintenance_discord_webhook: e.target.value })}
            placeholder="https://discord.com/api/webhooks/..."
          />
          <p className="text-xs text-gray-500 mt-2">{t(lang, 'admin.settings.webhookHint')}</p>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={saving}>
          {saving ? t(lang, 'common.saving') : t(lang, 'admin.settings.saveButton')}
        </Button>
      </form>
    </div>
  );
}
