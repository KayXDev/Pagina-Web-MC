'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Badge, Button, Card, Input, Select, Textarea } from '@/components/ui';
import { getClientLangFromCookie, type Lang, getDateLocale } from '@/lib/i18n';
import { formatDateTime, formatPrice } from '@/lib/utils';
import { PARTNER_MAX_DAYS } from '@/lib/partnerPricing';

type PartnerAd = {
  _id: string;
  userId: string;
  ownerUsername: string;
  serverName: string;
  address: string;
  version?: string;
  description: string;
  website?: string;
  discord?: string;
  banner?: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
};

type PartnerBooking = {
  _id: string;
  slot: number;
  kind: 'CUSTOM' | 'MONTHLY';
  days: number;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELED';
  provider: 'PAYPAL' | 'STRIPE';
  totalPrice: number;
  currency: string;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
};

type SlotQuote = {
  slot: number;
  available: boolean;
  days: number;
  dailyPriceEur: number;
  discountPct: number;
  totalEur: number;
};

function statusBadge(status: PartnerAd['status']) {
  if (status === 'APPROVED') return <Badge variant="success">Aprobado</Badge>;
  if (status === 'REJECTED') return <Badge variant="danger">Rechazado</Badge>;
  return <Badge variant="warning">Pendiente</Badge>;
}

function bookingBadge(status: PartnerBooking['status']) {
  if (status === 'ACTIVE') return <Badge variant="success">ACTIVO</Badge>;
  if (status === 'PENDING') return <Badge variant="warning">PENDIENTE</Badge>;
  if (status === 'EXPIRED') return <Badge variant="default">EXPIRADO</Badge>;
  return <Badge variant="default">CANCELADO</Badge>;
}

export default function PartnerPublishPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [lang, setLang] = useState<Lang>('es');

  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [ad, setAd] = useState<PartnerAd | null>(null);
  const [bookings, setBookings] = useState<PartnerBooking[]>([]);

  const [form, setForm] = useState({
    serverName: '',
    address: '',
    version: '',
    description: '',
    website: '',
    discord: '',
    banner: '',
  });

  const [bannerUploading, setBannerUploading] = useState(false);

  const [days, setDays] = useState<number>(7);
  const normalizedDays = Math.min(PARTNER_MAX_DAYS, Math.max(1, Math.floor(Number(days) || 1)));

  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotQuote[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number>(1);

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  const dateLocale = getDateLocale(lang);

  const loadMine = async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/partner/my-ad', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      const nextAd = (data as any).ad ? ((data as any).ad as PartnerAd) : null;
      const nextBookings = Array.isArray((data as any).bookings) ? ((data as any).bookings as PartnerBooking[]) : [];
      setAd(nextAd);
      setBookings(nextBookings);

      if (nextAd) {
        setForm({
          serverName: String((nextAd as any).serverName || ''),
          address: String((nextAd as any).address || ''),
          version: String((nextAd as any).version || ''),
          description: String((nextAd as any).description || ''),
          website: String((nextAd as any).website || ''),
          discord: String((nextAd as any).discord || ''),
          banner: String((nextAd as any).banner || ''),
        });
      }
    } catch (e: any) {
      setError(String(e?.message || 'Error'));
      setAd(null);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus !== 'authenticated') {
      setLoading(false);
      return;
    }
    void loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]);

  const loadSlots = async () => {
    setSlotsLoading(true);
    setSlotError(null);
    try {
      const qp = new URLSearchParams();
      qp.set('kind', 'CUSTOM');
      qp.set('days', String(normalizedDays));

      const res = await fetch(`/api/partner/slots?${qp.toString()}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      const next = Array.isArray((data as any).slots) ? ((data as any).slots as SlotQuote[]) : [];
      setSlots(next);
      const firstAvailable = next.find((s) => s.available);
      if (firstAvailable) setSelectedSlot(Number(firstAvailable.slot));
    } catch (e: any) {
      setSlotError(String(e?.message || 'Error'));
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    void loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, normalizedDays]);

  const selectedQuote = useMemo(() => {
    return slots.find((s) => Number(s.slot) === Number(selectedSlot)) || null;
  }, [slots, selectedSlot]);

  const cancelPending = async (bookingId: string) => {
    setCheckoutLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/partner/checkout/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      setInfo('Reserva cancelada.');
      await loadMine();
      await loadSlots();
    } catch (e: any) {
      setError(String(e?.message || 'Error'));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const isFormValid =
    form.serverName.trim().length >= 3 &&
    form.address.trim().length >= 3 &&
    form.description.trim().length >= 20 &&
    form.description.trim().length <= 500;

  const startStripe = async () => {
    if (!selectedQuote || !selectedQuote.available) {
      setError('Selecciona un slot disponible.');
      return;
    }
    if (!Number.isFinite(Number(selectedQuote.totalEur)) || Number(selectedQuote.totalEur) <= 0) {
      setError('El precio configurado es 0€. No se puede iniciar el pago.');
      return;
    }
    if (!isFormValid) {
      setError('Completa el formulario (mín. 20 caracteres en descripción).');
      return;
    }
    setCheckoutLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/partner/checkout/stripe/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot: Number(selectedQuote.slot),
          kind: 'CUSTOM',
          days: normalizedDays,

          serverName: form.serverName,
          address: form.address,
          version: form.version,
          description: form.description,
          website: form.website,
          discord: form.discord,
          banner: form.banner,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      const url = String((data as any).url || '').trim();
      if (!url) throw new Error('No se pudo iniciar el pago');
      window.location.href = url;
    } catch (e: any) {
      setError(String(e?.message || 'Error'));
      setCheckoutLoading(false);
    }
  };

  const uploadBanner = async (file: File) => {
    setBannerUploading(true);
    setError(null);
    setInfo(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/uploads/partner-banner', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      const url = String((data as any)?.url || '').trim();
      if (!url) throw new Error('Error al subir imagen');
      setForm((p) => ({ ...p, banner: url }));
    } catch (e: any) {
      setError(String(e?.message || 'Error al subir imagen'));
    } finally {
      setBannerUploading(false);
    }
  };

  const saveAdChanges = async () => {
    if (!isFormValid) {
      setError('Completa el formulario (mín. 20 caracteres en descripción).');
      return;
    }

    setCheckoutLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/partner/my-ad', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverName: form.serverName,
          address: form.address,
          version: form.version,
          description: form.description,
          website: form.website,
          discord: form.discord,
          banner: form.banner,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      setInfo('Cambios guardados.');
      await loadMine();
    } catch (e: any) {
      setError(String(e?.message || 'Error'));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const deleteAd = async () => {
    if (!ad) return;
    const ok = window.confirm('¿Seguro que quieres eliminar tu anuncio? Esto también lo quitará del ranking si está activo.');
    if (!ok) return;

    setCheckoutLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/partner/my-ad', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));

      setInfo('Anuncio eliminado.');
      setAd(null);
      setBookings([]);
      setForm({
        serverName: '',
        address: '',
        version: '',
        description: '',
        website: '',
        discord: '',
        banner: '',
      });
      await loadSlots();
    } catch (e: any) {
      setError(String(e?.message || 'Error'));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const startPaypal = async () => {
    if (!selectedQuote || !selectedQuote.available) {
      setError('Selecciona un slot disponible.');
      return;
    }
    if (!Number.isFinite(Number(selectedQuote.totalEur)) || Number(selectedQuote.totalEur) <= 0) {
      setError('El precio configurado es 0€. No se puede iniciar el pago.');
      return;
    }
    if (!isFormValid) {
      setError('Completa el formulario (mín. 20 caracteres en descripción).');
      return;
    }
    setCheckoutLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/partner/checkout/paypal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot: Number(selectedQuote.slot),
          kind: 'CUSTOM',
          days: normalizedDays,

          serverName: form.serverName,
          address: form.address,
          version: form.version,
          description: form.description,
          website: form.website,
          discord: form.discord,
          banner: form.banner,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      const url = String((data as any).approvalUrl || '').trim();
      if (!url) throw new Error('No se pudo iniciar el pago');
      window.location.href = url;
    } catch (e: any) {
      setError(String(e?.message || 'Error'));
      setCheckoutLoading(false);
    }
  };

  const pendingBooking = useMemo(() => bookings.find((b) => b.status === 'PENDING') || null, [bookings]);

  if (sessionStatus === 'loading') {
    return (
      <main className="max-w-3xl mx-auto py-10 px-4">
        <div className="text-gray-600 dark:text-gray-400">Cargando…</div>
      </main>
    );
  }

  if (sessionStatus !== 'authenticated') {
    return (
      <main className="max-w-3xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Publicar mi servidor</h1>
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-gray-700 dark:text-gray-300">Necesitas iniciar sesión para publicar.</div>
          <div className="mt-4">
            <Link href="/auth/login" className="inline-flex">
              <Button variant="primary" size="md">Iniciar sesión</Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto py-10 px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Publicar mi servidor</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Compra → rellena datos → revisión admin → aparece al aprobarse.</p>
        </div>
        <Link href="/partner" className="inline-flex">
          <Button variant="secondary" size="sm">Ver Partners</Button>
        </Link>
      </div>

      {error ? (
        <Card hover={false} className="rounded-2xl border border-red-200 bg-white dark:border-red-500/30 dark:bg-red-500/10 mb-4">
          <div className="text-red-700 dark:text-red-200 font-semibold">Error</div>
          <div className="text-red-700/80 dark:text-red-200/80 text-sm mt-1">{error}</div>
        </Card>
      ) : null}

      {info ? (
        <Card hover={false} className="rounded-2xl border border-green-200 bg-white dark:border-green-500/30 dark:bg-green-500/10 mb-4">
          <div className="text-green-700 dark:text-green-200 font-semibold">Listo</div>
          <div className="text-green-700/80 dark:text-green-200/80 text-sm mt-1">{info}</div>
        </Card>
      ) : null}

      {pendingBooking ? (
        <Card hover={false} className="rounded-2xl border border-yellow-200 bg-white dark:border-yellow-500/30 dark:bg-yellow-500/10 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-yellow-900 dark:text-yellow-100 font-semibold">Tienes una compra pendiente</div>
              <div className="text-yellow-900/80 dark:text-yellow-100/80 text-sm">Slot #{pendingBooking.slot} • {pendingBooking.provider} • {pendingBooking.days} días</div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => cancelPending(pendingBooking._id)} disabled={checkoutLoading}>
              {checkoutLoading ? 'Cancelando…' : 'Cancelar'}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-gray-900 dark:text-white font-bold">1) Duración y posición</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Elige cuántos días y en qué puesto apareces</div>
            </div>
            <Badge variant="info">Top 10</Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Duración</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Precio total (no por día) • EUR</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[1, 3, 7, 14, 30].map((d) => {
                    const active = normalizedDays === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDays(d)}
                        disabled={checkoutLoading}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                          active
                            ? 'border-minecraft-grass/30 bg-minecraft-grass/10 text-gray-900 dark:text-white'
                            : 'border-gray-200 bg-white hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
                        } ${checkoutLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {d}d
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Días (1–{PARTNER_MAX_DAYS})</label>
                  <Select value={String(normalizedDays)} onChange={(e) => setDays(Number(e.target.value || 1))} disabled={checkoutLoading}>
                    {Array.from({ length: PARTNER_MAX_DAYS }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>{d} día{d === 1 ? '' : 's'}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Detalle</label>
                  <Input value="Pago ahora → revisión admin → aparece al aprobarse" disabled />
                </div>
              </div>
            </div>
          </div>

          {slotError ? <div className="text-sm text-red-600 dark:text-red-300 mb-3">{slotError}</div> : null}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(slots || []).map((s) => {
                  const active = Number(selectedSlot) === Number(s.slot);
                  const disabled = !s.available || checkoutLoading;
                  return (
                    <button
                      key={s.slot}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedSlot(Number(s.slot))}
                      className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                        active
                          ? 'border-minecraft-grass/40 bg-minecraft-grass/10 ring-1 ring-minecraft-grass/20'
                          : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-gray-900 dark:text-white">#{s.slot}</div>
                        <span className={`text-[11px] ${s.available ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                          {s.available ? 'Libre' : 'Ocupado'}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
                        Total: {formatPrice(Number(s.totalEur || 0), dateLocale, 'EUR')}
                      </div>
                    </button>
                  );
                })}
              </div>

              {slotsLoading ? <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">Cargando slots…</div> : null}
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Resumen</div>
              <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                {selectedQuote ? (
                  <>
                    <div><span className="font-semibold">Slot:</span> #{selectedQuote.slot}</div>
                    <div><span className="font-semibold">Duración:</span> {selectedQuote.days} día{selectedQuote.days === 1 ? '' : 's'}</div>
                    <div className="mt-2 text-base font-bold text-gray-900 dark:text-white">
                      {formatPrice(Number(selectedQuote.totalEur || 0), dateLocale, 'EUR')}
                    </div>
                  </>
                ) : (
                  <div className="text-gray-600 dark:text-gray-400">Selecciona un slot.</div>
                )}
              </div>

              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Se activa al aprobarse por admin.
              </div>
            </div>
          </div>
        </Card>

        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-gray-900 dark:text-white font-bold">2) Rellena el formulario</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Se enviará a revisión al pagar</div>
            </div>
            {ad ? statusBadge(ad.status) : <Badge variant="info">Nuevo</Badge>}
          </div>

          {!selectedQuote && !ad ? (
            <div className="text-sm text-gray-600 dark:text-gray-400">Selecciona un slot para continuar.</div>
          ) : (
            <>
              {ad?.status === 'REJECTED' ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                  <div className="font-semibold">Rechazado</div>
                  <div className="opacity-90">{String(ad.rejectionReason || 'Sin motivo')}</div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Nombre del servidor</label>
                  <Input value={form.serverName} onChange={(e) => setForm((p) => ({ ...p, serverName: e.target.value }))} placeholder="Mi servidor" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">IP / Dominio</label>
                  <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="play.ejemplo.com" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Versión (opcional)</label>
                  <Input value={form.version} onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))} placeholder="1.20.x" />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Banner (archivo, opcional)</label>
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    disabled={checkoutLoading || bannerUploading}
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0];
                      e.currentTarget.value = '';
                      if (!file) return;
                      void uploadBanner(file);
                    }}
                  />
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {bannerUploading ? <span>Subiendo…</span> : null}
                    {!bannerUploading && form.banner ? (
                      <>
                        <a href={form.banner} target="_blank" rel="noreferrer" className="text-minecraft-grass hover:underline">Ver</a>
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, banner: '' }))}
                          disabled={checkoutLoading}
                        >
                          Quitar
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Web (opcional)</label>
                  <Input value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} placeholder="https://..." />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Discord (opcional)</label>
                  <Input value={form.discord} onChange={(e) => setForm((p) => ({ ...p, discord: e.target.value }))} placeholder="https://discord.gg/..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-600 dark:text-gray-400">Descripción</label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Cuenta qué ofrece tu servidor, modalidad, comunidad..."
                    rows={5}
                    minLength={20}
                    maxLength={500}
                  />
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{form.description.length}/500</div>
                </div>
              </div>

              {!isFormValid ? (
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                  Completa el formulario para poder pagar.
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Al pagar, se envía a revisión. Al aprobarse, tu slot se activa y apareces en la lista.
                </div>
                <div className="flex items-center gap-2">
                  {ad ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={saveAdChanges}
                      disabled={checkoutLoading || bannerUploading || !isFormValid}
                    >
                      Guardar cambios
                    </Button>
                  ) : null}
                  {ad ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={deleteAd}
                      disabled={checkoutLoading || bannerUploading || Boolean(pendingBooking)}
                    >
                      Eliminar
                    </Button>
                  ) : null}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={startStripe}
                    disabled={checkoutLoading || slotsLoading || !selectedQuote?.available || !isFormValid || Boolean(pendingBooking)}
                  >
                    {checkoutLoading ? 'Procesando…' : 'Pagar con Stripe'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={startPaypal}
                    disabled={checkoutLoading || slotsLoading || !selectedQuote?.available || !isFormValid || Boolean(pendingBooking)}
                  >
                    PayPal
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-gray-900 dark:text-white font-bold">Tus reservas</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Historial (máx. 20)</div>
            </div>
            <Button variant="secondary" size="sm" onClick={loadMine} disabled={loading}>Recargar</Button>
          </div>

          {!bookings.length ? (
            <div className="text-sm text-gray-600 dark:text-gray-400">Aún no tienes reservas.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                    <th className="py-2 pr-4">Estado</th>
                    <th className="py-2 pr-4">Slot</th>
                    <th className="py-2 pr-4">Duración</th>
                    <th className="py-2 pr-4">Pago</th>
                    <th className="py-2 pr-4">Creada</th>
                    <th className="py-2 pr-4">Fin</th>
                    <th className="py-2">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {bookings.map((b) => (
                    <tr key={b._id} className="text-gray-700 dark:text-gray-200">
                      <td className="py-3 pr-4">{bookingBadge(b.status)}</td>
                      <td className="py-3 pr-4 font-semibold">#{b.slot}</td>
                      <td className="py-3 pr-4">{b.kind === 'MONTHLY' ? 'Mensual' : `${b.days} días`}</td>
                      <td className="py-3 pr-4">{b.provider} • {formatPrice(Number(b.totalPrice || 0), dateLocale, String(b.currency || 'EUR'))}</td>
                      <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400">{formatDateTime(b.createdAt, dateLocale)}</td>
                      <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400">{b.endsAt ? formatDateTime(b.endsAt, dateLocale) : '—'}</td>
                      <td className="py-3">
                        {b.status === 'PENDING' ? (
                          <Button variant="secondary" size="sm" onClick={() => cancelPending(b._id)} disabled={checkoutLoading}>
                            Cancelar
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
