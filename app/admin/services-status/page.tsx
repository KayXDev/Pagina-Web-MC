'use client';

import { useEffect, useState } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui';
import { FaHeartbeat } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

type ServicesStatusSettings = {
  services_status_discord_webhook: string;
  services_status_interval_minutes: string;
  services_status_auto_enabled: string;
  services_status_last_sent_at?: string;
};

export default function AdminServicesStatusPage() {
  const lang = useClientLang();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [togglingAuto, setTogglingAuto] = useState(false);

  const [settings, setSettings] = useState<ServicesStatusSettings>({
    services_status_discord_webhook: '',
    services_status_interval_minutes: '60',
    services_status_auto_enabled: 'true',
    services_status_last_sent_at: '',
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings', { cache: 'no-store' });
      if (!response.ok) throw new Error(t(lang, 'admin.settings.loadError'));
      const data = await response.json();

      setSettings((prev) => ({
        ...prev,
        services_status_discord_webhook: String(data?.services_status_discord_webhook || ''),
        services_status_interval_minutes: String(data?.services_status_interval_minutes || '60'),
        services_status_auto_enabled: String(data?.services_status_auto_enabled ?? 'true'),
        services_status_last_sent_at: String(data?.services_status_last_sent_at || ''),
      }));
    } catch {
      toast.error(t(lang, 'admin.settings.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          services_status_discord_webhook: settings.services_status_discord_webhook,
          services_status_interval_minutes: settings.services_status_interval_minutes,
          services_status_auto_enabled: settings.services_status_auto_enabled,
        }),
      });

      if (!response.ok) throw new Error(t(lang, 'admin.settings.saveError'));
      toast.success(lang === 'es' ? 'Estado de servicios guardado' : 'Services status saved');
      fetchSettings();
    } catch (err: any) {
      toast.error(err?.message || t(lang, 'admin.settings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const toggleAuto = async () => {
    const nextValue = autoEnabled ? 'false' : 'true';
    setTogglingAuto(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services_status_auto_enabled: nextValue }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String((data as any)?.error || (lang === 'es' ? 'Error actualizando automático' : 'Error updating auto mode')));
      }

      setSettings((prev) => ({ ...prev, services_status_auto_enabled: nextValue }));
      toast.success(
        nextValue === 'true'
          ? (lang === 'es' ? 'Automático encendido' : 'Auto mode enabled')
          : (lang === 'es' ? 'Automático apagado' : 'Auto mode disabled')
      );
    } catch (err: any) {
      toast.error(err?.message || (lang === 'es' ? 'Error actualizando automático' : 'Error updating auto mode'));
    } finally {
      setTogglingAuto(false);
    }
  };

  const sendNow = async () => {
    setSending(true);
    try {
      const response = await fetch('/api/admin/services-status/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String((data as any)?.error || (lang === 'es' ? 'Error enviando reporte' : 'Error sending report')));
      }

      toast.success(lang === 'es' ? 'Reporte enviado a Discord' : 'Report sent to Discord');
      fetchSettings();
    } catch (err: any) {
      toast.error(err?.message || (lang === 'es' ? 'Error enviando reporte' : 'Error sending report'));
    } finally {
      setSending(false);
    }
  };

  const webhookConfigured = Boolean(String(settings.services_status_discord_webhook || '').trim());
  const autoEnabled = String(settings.services_status_auto_enabled ?? 'true').trim() !== 'false';
  const lastSentText = String(settings.services_status_last_sent_at || '').trim();

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25 overflow-hidden p-0" hover={false}>
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-black/20">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{lang === 'es' ? 'Estado de servicios' : 'Services status'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{t(lang, 'admin.settings.loading')}</div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-white/10">
            {Array.from({ length: 4 }).map((_, i) => (
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
            <FaHeartbeat />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-transparent dark:bg-gradient-to-r dark:from-white dark:via-gray-200 dark:to-white dark:bg-clip-text truncate">
              {lang === 'es' ? 'Estado de servicios' : 'Services status'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
              {lang === 'es'
                ? 'Configura el webhook e intervalo del reporte automático a Discord.'
                : 'Configure the webhook and interval for automatic Discord reports.'}
            </p>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-gray-900 dark:text-white font-semibold mb-2">
              {lang === 'es' ? 'Webhook de Discord' : 'Discord webhook'}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={webhookConfigured ? 'success' : 'default'}>
                {webhookConfigured
                  ? (lang === 'es' ? 'CONFIGURADO' : 'CONFIGURED')
                  : (lang === 'es' ? 'NO CONFIGURADO' : 'NOT CONFIGURED')}
              </Badge>
              <Badge variant={autoEnabled ? 'success' : 'warning'}>
                {autoEnabled ? (lang === 'es' ? 'AUTO: ON' : 'AUTO: ON') : (lang === 'es' ? 'AUTO: OFF' : 'AUTO: OFF')}
              </Badge>
              <div className="text-xs text-gray-500">
                {lang === 'es'
                  ? 'Se usa para enviar el embed del estado de servicios.'
                  : 'Used to send the services status embed.'}
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {lastSentText
                ? (lang === 'es' ? `Último envío: ${lastSentText}` : `Last sent: ${lastSentText}`)
                : (lang === 'es' ? 'Último envío: —' : 'Last sent: —')}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <Button
              type="button"
              variant={autoEnabled ? 'danger' : 'success'}
              onClick={toggleAuto}
              disabled={togglingAuto}
            >
              {togglingAuto
                ? (lang === 'es' ? 'Actualizando…' : 'Updating…')
                : autoEnabled
                  ? (lang === 'es' ? 'Apagar automático' : 'Turn off auto')
                  : (lang === 'es' ? 'Encender automático' : 'Turn on auto')}
            </Button>

            <Button type="button" variant="secondary" onClick={sendNow} disabled={sending || !webhookConfigured}>
              {sending
                ? (lang === 'es' ? 'Enviando…' : 'Sending…')
                : (lang === 'es' ? 'Enviar reporte ahora' : 'Send report now')}
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <Input
            type="text"
            value={settings.services_status_discord_webhook}
            onChange={(e) => setSettings((prev) => ({ ...prev, services_status_discord_webhook: e.target.value }))}
            placeholder="https://discord.com/api/webhooks/..."
          />
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-2">{lang === 'es' ? 'Intervalo automático' : 'Automatic interval'}</div>
            <select
              value={settings.services_status_interval_minutes}
              onChange={(e) => setSettings((prev) => ({ ...prev, services_status_interval_minutes: e.target.value }))}
              className="w-full px-4 py-2.5 bg-white/90 border border-gray-300/80 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-minecraft-diamond/60 focus:border-transparent transition-all duration-200 dark:bg-gray-950/30 dark:border-white/10 dark:text-gray-100"
            >
              <option value="30">{lang === 'es' ? 'Cada 30 minutos' : 'Every 30 minutes'}</option>
              <option value="60">{lang === 'es' ? 'Cada 1 hora' : 'Every 1 hour'}</option>
            </select>
          </div>
          <div className="text-xs text-gray-500 flex items-end">
            {lang === 'es'
              ? 'El cron se ejecuta automáticamente en Vercel. Asegúrate de tener el webhook configurado y el automático encendido.'
              : 'The cron runs automatically on Vercel. Make sure the webhook is configured and auto is enabled.'}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? t(lang, 'common.saving') : (lang === 'es' ? 'Guardar' : 'Save')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
