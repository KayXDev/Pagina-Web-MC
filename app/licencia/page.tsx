import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { getLangFromCookieStore } from '@/lib/i18n';
import { validateLicense } from '@/lib/license';
import { getStoredLicenseMetadata } from '@/lib/license-settings';

export const dynamic = 'force-dynamic';

export default async function LicenciaPage() {
  const cookieStore = cookies();
  const headerStore = headers();
  const lang = getLangFromCookieStore(cookieStore);

  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || '';
  const proto = headerStore.get('x-forwarded-proto') || 'https';
  const result = await validateLicense({
    host,
    origin: host ? `${proto}://${host}` : undefined,
    pathname: '/licencia',
    userAgent: headerStore.get('user-agent') || '',
  });
  const storedLicense = await getStoredLicenseMetadata();
  const effectiveExpiresAt = storedLicense.expiresAt || result.expiresAt || null;

  const isEs = lang === 'es';
  const title = isEs ? 'Licencia requerida' : 'License required';
  const subtitle = isEs
    ? 'Esta instalación necesita una licencia válida para seguir funcionando.'
    : 'This installation needs a valid license to keep running.';
  const statusLabel = result.status.toUpperCase();
  const statusTone = result.ok
    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
    : 'bg-red-500/15 text-red-300 border-red-500/20';
  const reasonLabel = isEs ? 'Motivo' : 'Reason';
  const setupTitle = isEs ? 'Configuración recomendada' : 'Recommended setup';
  const detailTitle = isEs ? 'Estado de validación' : 'Validation status';
  const discordUrl = process.env.DISCORD_URL || process.env.NEXT_PUBLIC_DISCORD_URL || 'https://discord.gg/TU_INVITE';
  const supportTitle = isEs ? 'Necesitas ayuda?' : 'Need help?';
  const supportText = isEs
    ? 'Si tienes cualquier problema con tu licencia, entra al Discord de soporte y abre un ticket con el estado mostrado en esta pantalla.'
    : 'If you have any problem with your license, join the support Discord server and open a ticket with the status shown on this page.';
  const instructions = isEs
    ? [
        'Añade tu KAYX_LICENSE_KEY emitida para esta instalación.',
        'Usa el nombre exacto del producto en KAYX_PRODUCT_ID.',
        'No intentes configurar la URL del validador o el token interno desde .env: ahora vienen embebidos en el proyecto.',
        'Si eres admin, revisa el monitor interno en /admin/licencia después de iniciar sesión.',
      ]
    : [
        'Add the KAYX_LICENSE_KEY issued for this installation.',
        'Use the exact product name in KAYX_PRODUCT_ID.',
        'Do not try to configure the validator URL or internal token from .env: they are now embedded in the project.',
        'If you are an admin, review the internal monitor at /admin/licencia after signing in.',
      ];
  const envExample = [
    'KAYX_LICENSE_KEY=XXXX-XXXX-XXXX',
    'KAYX_PRODUCT_ID=minecraft-server-web',
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020817] px-6 py-16 md:py-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_35%),linear-gradient(90deg,transparent,rgba(59,130,246,0.08),transparent)]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/65 shadow-2xl shadow-cyan-950/25 backdrop-blur-xl">
          <div className="border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-950/95 to-red-950/20 px-6 py-6 md:px-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-red-400/20 bg-red-500/10 text-xl font-bold text-red-300 shadow-lg shadow-red-900/20">
                  !
                </div>
                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
                    KayX license gateway
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{title}</h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">{subtitle}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone}`}>
                  {statusLabel}
                </span>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{detailTitle}</div>
                  <div className="mt-1 text-sm font-semibold text-white">{result.message}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 md:grid-cols-[1.15fr_0.85fr] md:px-8 md:py-8">
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-white">{setupTitle}</h2>
                  {result.reason ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      {reasonLabel}: {result.reason}
                    </span>
                  ) : null}
                </div>
                <ul className="space-y-3 text-sm text-slate-300 md:text-[15px]">
                  {instructions.map((item, index) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 text-xs font-bold text-cyan-200">
                        {index + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#020617]/80 p-5 shadow-inner shadow-black/20">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-white">.env</h2>
                  <span className="rounded-full border border-cyan-400/15 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-200">
                    Minimal env
                  </span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-sm leading-7 text-slate-300">
                  {envExample.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 text-cyan-200">↗</div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{isEs ? 'Comprobación actual' : 'Current check'}</h2>
                    <p className="text-sm text-slate-400">{isEs ? 'Respuesta recibida desde el validador remoto.' : 'Response received from the remote validator.'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Message</div>
                    <div className="mt-2 text-sm font-medium text-slate-200">{result.message}</div>
                  </div>

                  {result.reason ? (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{reasonLabel}</div>
                      <div className="mt-2 text-sm font-medium text-slate-200">{result.reason}</div>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Checked at</div>
                    <div className="mt-2 text-sm font-medium text-slate-200">
                      {new Date(result.checkedAt).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US')}
                    </div>
                  </div>

                  {effectiveExpiresAt ? (
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {isEs ? 'License expiry' : 'License expiry'}
                      </div>
                      <div className="mt-2 text-sm font-medium text-slate-200">
                        {new Date(effectiveExpiresAt).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US')}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.05] p-5">
                <h2 className="text-lg font-semibold text-white">{supportTitle}</h2>
                <p className="mt-2 text-sm text-slate-300">{supportText}</p>
                <div className="mt-4">
                  <Link
                    href={discordUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition-colors hover:bg-cyan-500/15"
                  >
                    Join Discord support
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h2 className="text-lg font-semibold text-white">{isEs ? 'Siguiente revisión' : 'Next check'}</h2>
                <p className="mt-2 text-sm text-slate-400">
                  {isEs
                    ? 'Los administradores pueden revisar el estado completo desde /admin/licencia. Los usuarios normales deben contactar con soporte.'
                    : 'Admins can review the full status from /admin/licencia. Regular users should contact support.'}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white">
                    /admin/licencia
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
