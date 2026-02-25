'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Input, Textarea, Badge } from '@/components/ui';
import { FaCheck, FaCog, FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

export default function AdminMaintenancePage() {
  const lang = useClientLang();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customPath, setCustomPath] = useState('');
  const [settings, setSettings] = useState({
    maintenance_mode: 'false',
    maintenance_message: 'Estamos en mantenimiento. Vuelve más tarde.',
    maintenance_paths: '',
    maintenance_discord_webhook: '',
    services_status_discord_webhook: '',
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
  const optionsPathSet = new Set(MAINTENANCE_ROUTE_OPTIONS.map((o) => o.path));
  const customSelectedPaths = Array.from(selectedMaintenancePaths).filter((p) => !optionsPathSet.has(p));

  const toggleMaintenancePath = (path: string) => {
    const next = new Set(selectedMaintenancePaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSettings({ ...settings, maintenance_paths: stringifyMaintenancePaths(Array.from(next)) });
  };

  const setMaintenanceEnabled = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, maintenance_mode: enabled ? 'true' : 'false' }));
  };

  const addCustomPath = () => {
    const raw = String(customPath || '').trim();
    if (!raw) return;

    const normalized = raw.startsWith('/') ? raw : `/${raw}`;
    const looksOk = normalized === '/' || normalized.startsWith('/');
    if (!looksOk) {
      toast.error(lang === 'es' ? 'Ruta inválida' : 'Invalid path');
      return;
    }

    const next = new Set(selectedMaintenancePaths);
    next.add(normalized);
    setSettings((prev) => ({ ...prev, maintenance_paths: stringifyMaintenancePaths(Array.from(next)) }));
    setCustomPath('');
  };

  const removeMaintenancePath = (path: string) => {
    const next = new Set(selectedMaintenancePaths);
    next.delete(path);
    setSettings((prev) => ({ ...prev, maintenance_paths: stringifyMaintenancePaths(Array.from(next)) }));
  };

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

  const sendServicesStatusReport = async () => {
    try {
      const response = await fetch('/api/admin/services-status/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(data?.error || (lang === 'es' ? 'Error enviando reporte' : 'Error sending report')));
      }

      toast.success(lang === 'es' ? 'Reporte enviado a Discord' : 'Report sent to Discord');
    } catch (err: any) {
      toast.error(err?.message || (lang === 'es' ? 'Error enviando reporte' : 'Error sending report'));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25 overflow-hidden p-0" hover={false}>
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/20">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{t(lang, 'admin.settings.title')}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{t(lang, 'admin.settings.loading')}</div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-white/10">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 shimmer" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gray-100 border border-gray-200 grid place-items-center text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-white">
            <FaCog />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-transparent dark:bg-gradient-to-r dark:from-white dark:via-gray-200 dark:to-white dark:bg-clip-text truncate">
              {t(lang, 'admin.settings.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">{t(lang, 'admin.settings.subtitle')}</p>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FaCog />
                <span>{t(lang, 'admin.settings.sectionTitle')}</span>
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">{t(lang, 'admin.settings.sectionDesc')}</p>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={settings.maintenance_mode === 'true' ? 'warning' : 'default'}>
                {settings.maintenance_mode === 'true' ? (lang === 'es' ? 'ACTIVO' : 'ACTIVE') : (lang === 'es' ? 'INACTIVO' : 'INACTIVE')}
              </Badge>

              <button
                type="button"
                role="switch"
                aria-checked={settings.maintenance_mode === 'true'}
                onClick={() => setMaintenanceEnabled(!(settings.maintenance_mode === 'true'))}
                className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors ${
                  settings.maintenance_mode === 'true'
                    ? 'bg-minecraft-grass/80 border-minecraft-grass/40'
                    : 'bg-gray-200 border-gray-300 dark:bg-white/5 dark:border-white/10'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white/90 transition-transform ${
                    settings.maintenance_mode === 'true' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>

              <span className="text-gray-700 dark:text-gray-300 text-sm select-none">{t(lang, 'admin.settings.enableMaintenance')}</span>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t(lang, 'admin.settings.messageLabel')}</label>
            <Textarea
              rows={4}
              value={settings.maintenance_message}
              onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
              placeholder={t(lang, 'admin.settings.messagePlaceholder')}
            />
          </div>
        </Card>

        <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="text-gray-900 dark:text-white font-semibold">{t(lang, 'admin.settings.maintenancePathsLabel')}</div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {selectedMaintenancePaths.size} {lang === 'es' ? 'seleccionadas' : 'selected'}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    maintenance_paths: stringifyMaintenancePaths(MAINTENANCE_ROUTE_OPTIONS.map((o) => o.path)),
                  }))
                }
              >
                {lang === 'es' ? 'Seleccionar todo' : 'Select all'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSettings((prev) => ({ ...prev, maintenance_paths: '' }))}
              >
                {lang === 'es' ? 'Limpiar' : 'Clear'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MAINTENANCE_ROUTE_OPTIONS.map((opt) => (
              <button
                key={opt.path}
                type="button"
                onClick={() => toggleMaintenancePath(opt.path)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  selectedMaintenancePaths.has(opt.path)
                    ? 'border-minecraft-grass/40 bg-minecraft-grass/10 dark:border-minecraft-grass/30 dark:bg-minecraft-grass/10'
                    : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-lg border grid place-items-center ${
                    selectedMaintenancePaths.has(opt.path)
                      ? 'border-minecraft-grass/40 bg-minecraft-grass/15 text-minecraft-grass dark:border-minecraft-grass/30 dark:bg-minecraft-grass/10'
                      : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300'
                  }`}
                  aria-hidden="true"
                >
                  {selectedMaintenancePaths.has(opt.path) ? <FaCheck /> : <span className="text-xs">•</span>}
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-gray-900 dark:text-white font-medium truncate">{t(lang, opt.labelKey)}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{opt.path}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-5">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {lang === 'es' ? 'Añadir ruta personalizada' : 'Add custom path'}
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder={lang === 'es' ? '/mi-seccion o /mi-seccion/*' : '/my-section or /my-section/*'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomPath();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={addCustomPath}>
                <FaPlus />
                <span>{lang === 'es' ? 'Añadir' : 'Add'}</span>
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {lang === 'es'
                ? 'Tip: puedes usar * al final para aplicar por prefijo (ej: /foro/*).'
                : 'Tip: you can use * at the end for prefix matching (e.g. /forum/*).'}
            </p>
          </div>

          {customSelectedPaths.length ? (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {lang === 'es' ? 'Rutas personalizadas seleccionadas' : 'Selected custom paths'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {customSelectedPaths.length}
                </div>
              </div>
              <div className="mt-2 space-y-2">
                {customSelectedPaths
                  .slice()
                  .sort((a, b) => a.localeCompare(b))
                  .map((p) => (
                    <div key={p} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-black/20">
                      <div className="min-w-0">
                        <div className="text-sm text-gray-900 dark:text-white truncate">{p}</div>
                        <div className="text-[11px] text-gray-600 dark:text-gray-400">
                          {lang === 'es'
                            ? 'No está en la lista de secciones (arriba).'
                            : 'Not in the section list (above).'}
                        </div>
                      </div>
                      <Button type="button" variant="secondary" size="sm" onClick={() => removeMaintenancePath(p)}>
                        {lang === 'es' ? 'Quitar' : 'Remove'}
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}

          <p className="text-xs text-gray-500 mt-3">{t(lang, 'admin.settings.maintenancePathsHint')}</p>
        </Card>

        <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
          <div className="text-gray-900 dark:text-white font-semibold mb-2">{t(lang, 'admin.settings.webhookLabel')}</div>
          <Input
            type="text"
            value={settings.maintenance_discord_webhook}
            onChange={(e) => setSettings({ ...settings, maintenance_discord_webhook: e.target.value })}
            placeholder="https://discord.com/api/webhooks/..."
          />
          <p className="text-xs text-gray-500 mt-2">{t(lang, 'admin.settings.webhookHint')}</p>
        </Card>

        <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-gray-900 dark:text-white font-semibold mb-2">
                {lang === 'es' ? 'Webhook — Estado de servicios' : 'Webhook — Services status'}
              </div>
              <p className="text-xs text-gray-500">
                {lang === 'es'
                  ? 'Se usa para enviar un embed con el estado de Web/DB/Minecraft/Stripe.'
                  : 'Used to send an embed with Web/DB/Minecraft/Stripe status.'}
              </p>
            </div>

            <Button type="button" variant="secondary" onClick={sendServicesStatusReport}>
              {lang === 'es' ? 'Enviar reporte ahora' : 'Send report now'}
            </Button>
          </div>

          <div className="mt-4">
            <Input
              type="text"
              value={settings.services_status_discord_webhook}
              onChange={(e) => setSettings({ ...settings, services_status_discord_webhook: e.target.value })}
              placeholder="https://discord.com/api/webhooks/..."
            />
          </div>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={saving}>
          {saving ? t(lang, 'common.saving') : t(lang, 'admin.settings.saveButton')}
        </Button>
      </form>
    </div>
  );
}
