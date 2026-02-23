'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Badge, Button, Card, Input, Select, Textarea } from '@/components/ui';
import { getClientLangFromCookie, type Lang, getDateLocale } from '@/lib/i18n';
import { formatDateTime, formatPrice } from '@/lib/utils';
import { PARTNER_MAX_DAYS, PARTNER_SLOTS, type PartnerPricingConfig } from '@/lib/partnerPricing';

type AdminAd = {
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

type AdminBooking = {
  _id: string;
  adId: string;
  userId: string;
  slot: number;
  kind: 'CUSTOM' | 'MONTHLY';
  days: number;
  currency: string;
  totalPrice: number;
  provider: 'PAYPAL' | 'STRIPE';
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELED';
  paidAt?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
  ad?: { serverName: string; ownerUsername: string; status: string } | null;
};

function adBadge(status: AdminAd['status']) {
  if (status === 'APPROVED') return <Badge variant="success">APROBADO</Badge>;
  if (status === 'REJECTED') return <Badge variant="danger">RECHAZADO</Badge>;
  return <Badge variant="warning">PENDIENTE</Badge>;
}

function bookingBadge(status: AdminBooking['status']) {
  if (status === 'ACTIVE') return <Badge variant="success">ACTIVO</Badge>;
  if (status === 'PENDING') return <Badge variant="warning">PENDIENTE</Badge>;
  if (status === 'EXPIRED') return <Badge variant="default">EXPIRADO</Badge>;
  return <Badge variant="default">CANCELADO</Badge>;
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="absolute inset-0 overflow-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/95">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <div className="text-gray-900 dark:text-white font-bold truncate">{title}</div>
              </div>
              <Button variant="secondary" size="sm" onClick={onClose}>Cerrar</Button>
            </div>
            {children}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PartnerAdminPage() {
  const { data: session, status: sessionStatus } = useSession();
  const role = session?.user?.role;

  const [tab, setTab] = useState<'ADS' | 'BOOKINGS' | 'PRICING' | 'OWNER'>('ADS');

  const [lang, setLang] = useState<Lang>('es');
  useEffect(() => setLang(getClientLangFromCookie()), []);
  const dateLocale = getDateLocale(lang);

  const [adsStatus, setAdsStatus] = useState<AdminAd['status']>('PENDING_REVIEW');
  const [adsLoading, setAdsLoading] = useState(false);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [ads, setAds] = useState<AdminAd[]>([]);
  const [selectedAdId, setSelectedAdId] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [editAdSaving, setEditAdSaving] = useState(false);
  const [editAdError, setEditAdError] = useState<string | null>(null);
  const [editAdForm, setEditAdForm] = useState({
    ownerUsername: '',
    serverName: '',
    address: '',
    version: '',
    description: '',
    website: '',
    discord: '',
    banner: '',
  });

  const [bookingsStatus, setBookingsStatus] = useState<AdminBooking['status'] | 'PENDING_OR_ACTIVE'>('PENDING_OR_ACTIVE');
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);

  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PartnerPricingConfig | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricingDay, setPricingDay] = useState<number>(7);

  const [overridesOpen, setOverridesOpen] = useState(false);
  const [systemAdOpen, setSystemAdOpen] = useState(false);
  const [editAdOpen, setEditAdOpen] = useState(false);

  const [overridesLoading, setOverridesLoading] = useState(false);
  const [overridesSaving, setOverridesSaving] = useState(false);
  const [overridesError, setOverridesError] = useState<string | null>(null);
  const [slotOverrides, setSlotOverrides] = useState<string[]>(Array(PARTNER_SLOTS).fill(''));
  const [approvedAds, setApprovedAds] = useState<AdminAd[]>([]);

  const [systemAdCreating, setSystemAdCreating] = useState(false);
  const [systemAdError, setSystemAdError] = useState<string | null>(null);
  const [systemAdForm, setSystemAdForm] = useState({
    ownerUsername: String(session?.user?.name || session?.user?.email || 'Owner'),
    serverName: '',
    address: '',
    version: '',
    description: '',
    website: '',
    discord: '',
    banner: '',
  });

  const canAccess = role === 'ADMIN' || role === 'OWNER';

  const canOverrideSlots = role === 'OWNER';

  const loadOverrides = async () => {
    setOverridesLoading(true);
    setOverridesError(null);
    try {
      const res = await fetch('/api/admin/partner/slots', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      const slots = Array.isArray((data as any)?.overrides?.slots) ? ((data as any).overrides.slots as any[]) : [];
      const next = Array.from({ length: PARTNER_SLOTS }, (_, i) => String(slots[i] ?? '').trim());
      setSlotOverrides(next);
    } catch (e: any) {
      setOverridesError(String(e?.message || 'Error'));
      setSlotOverrides(Array(PARTNER_SLOTS).fill(''));
    } finally {
      setOverridesLoading(false);
    }
  };

  const loadApprovedAds = async () => {
    try {
      const qp = new URLSearchParams();
      qp.set('status', 'APPROVED');
      const res = await fetch(`/api/admin/partner/ads?${qp.toString()}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      const items = Array.isArray((data as any).items) ? ((data as any).items as AdminAd[]) : [];
      setApprovedAds(items);
    } catch {
      setApprovedAds([]);
    }
  };

  const saveOverrides = async () => {
    setOverridesSaving(true);
    setOverridesError(null);
    try {
      const res = await fetch('/api/admin/partner/slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: slotOverrides }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      await loadOverrides();
      setOverridesOpen(false);
    } catch (e: any) {
      setOverridesError(String(e?.message || 'Error'));
    } finally {
      setOverridesSaving(false);
    }
  };

  const createSystemAd = async () => {
    setSystemAdCreating(true);
    setSystemAdError(null);
    try {
      const res = await fetch('/api/admin/partner/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemAdForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      setSystemAdForm((p) => ({ ...p, serverName: '', address: '', version: '', description: '', website: '', discord: '', banner: '' }));
      await loadApprovedAds();
      setSystemAdOpen(false);
    } catch (e: any) {
      setSystemAdError(String(e?.message || 'Error'));
    } finally {
      setSystemAdCreating(false);
    }
  };

  const loadPricing = async () => {
    setPricingLoading(true);
    setPricingError(null);
    try {
      const res = await fetch('/api/admin/partner/pricing', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      const cfg = (data as any)?.config as PartnerPricingConfig | undefined;
      if (!cfg) throw new Error('Config inválida');
      setPricing({
        slotTotalsEur: Array.isArray((cfg as any).slotTotalsEur)
          ? ((cfg as any).slotTotalsEur as any[]).map((row) =>
              Array.isArray(row)
                ? row.map((n) => {
                    const v = Number(n);
                    return Number.isFinite(v) ? Math.max(0, Math.round(v * 100) / 100) : 0;
                  })
                : []
            )
          : [],
      });
    } catch (e: any) {
      setPricingError(String(e?.message || 'Error'));
      setPricing(null);
    } finally {
      setPricingLoading(false);
    }
  };

  const savePricing = async () => {
    if (!pricing) return;
    const ok =
      Array.isArray(pricing.slotTotalsEur) &&
      pricing.slotTotalsEur.length === PARTNER_SLOTS &&
      pricing.slotTotalsEur.every((row) => Array.isArray(row) && row.length === PARTNER_MAX_DAYS);
    if (!ok) {
      setPricingError(`Debes rellenar los precios para ${PARTNER_SLOTS} slots y ${PARTNER_MAX_DAYS} días.`);
      return;
    }

    setPricingSaving(true);
    setPricingError(null);
    try {
      const res = await fetch('/api/admin/partner/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotTotalsEur: pricing.slotTotalsEur,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      await loadPricing();
      setPricingOpen(false);
    } catch (e: any) {
      setPricingError(String(e?.message || 'Error'));
    } finally {
      setPricingSaving(false);
    }
  };

  const loadAds = async () => {
    setAdsLoading(true);
    setAdsError(null);
    try {
      const qp = new URLSearchParams();
      qp.set('status', adsStatus);
      const res = await fetch(`/api/admin/partner/ads?${qp.toString()}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      const nextAds = Array.isArray((data as any).items) ? ((data as any).items as AdminAd[]) : [];
      setAds(nextAds);
      setSelectedAdId((prev) => {
        if (prev && nextAds.some((a) => a._id === prev)) return prev;
        return nextAds[0]?._id || '';
      });
    } catch (e: any) {
      setAdsError(String(e?.message || 'Error'));
      setAds([]);
      setSelectedAdId('');
    } finally {
      setAdsLoading(false);
    }
  };

  const loadBookings = async () => {
    setBookingsLoading(true);
    setBookingsError(null);
    try {
      const qp = new URLSearchParams();
      if (bookingsStatus !== 'PENDING_OR_ACTIVE') qp.set('status', bookingsStatus);
      const res = await fetch(`/api/admin/partner/bookings?${qp.toString()}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      setBookings(Array.isArray((data as any).items) ? ((data as any).items as AdminBooking[]) : []);
    } catch (e: any) {
      setBookingsError(String(e?.message || 'Error'));
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !canAccess) return;
    void loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, canAccess, adsStatus]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !canAccess) return;
    void loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, canAccess, bookingsStatus]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !canAccess) return;
    void loadPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, canAccess]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !canOverrideSlots) return;
    void loadOverrides();
    void loadApprovedAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, canOverrideSlots]);

  const decide = async (adId: string, action: 'APPROVE' | 'REJECT') => {
    const reason = action === 'REJECT' ? String(rejectReason || '').trim() : '';
    if (action === 'REJECT' && !reason) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/partner/ads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId, action, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      await loadAds();
      await loadBookings();
    } catch (e: any) {
      alert(String(e?.message || 'Error'));
    } finally {
      setActionLoading(false);
    }
  };

  const stats = useMemo(() => {
    const pending = ads.filter((a) => a.status === 'PENDING_REVIEW').length;
    const approved = ads.filter((a) => a.status === 'APPROVED').length;
    const rejected = ads.filter((a) => a.status === 'REJECTED').length;
    return { pending, approved, rejected };
  }, [ads]);

  const selectedAd = useMemo(() => {
    return ads.find((a) => a._id === selectedAdId) || null;
  }, [ads, selectedAdId]);

  useEffect(() => {
    setRejectReason(String(selectedAd?.rejectionReason || ''));
  }, [selectedAd]);

  useEffect(() => {
    if (!selectedAd) return;
    setEditAdError(null);
    setEditAdForm({
      ownerUsername: String(selectedAd.ownerUsername || ''),
      serverName: String(selectedAd.serverName || ''),
      address: String(selectedAd.address || ''),
      version: String(selectedAd.version || ''),
      description: String(selectedAd.description || ''),
      website: String(selectedAd.website || ''),
      discord: String(selectedAd.discord || ''),
      banner: String(selectedAd.banner || ''),
    });
  }, [selectedAdId]);

  const saveSelectedAd = async () => {
    if (!selectedAd) return;
    setEditAdSaving(true);
    setEditAdError(null);
    try {
      const res = await fetch('/api/admin/partner/ads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adId: selectedAd._id,
          ownerUsername: editAdForm.ownerUsername,
          serverName: editAdForm.serverName,
          address: editAdForm.address,
          version: editAdForm.version,
          description: editAdForm.description,
          website: editAdForm.website,
          discord: editAdForm.discord,
          banner: editAdForm.banner,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      await loadAds();
      await loadBookings();
      setEditAdOpen(false);
    } catch (e: any) {
      setEditAdError(String(e?.message || 'Error'));
    } finally {
      setEditAdSaving(false);
    }
  };

  const deleteSelectedAd = async () => {
    if (!selectedAd) return;
    const ok = window.confirm('¿Eliminar este anuncio? Si está activo, se quitará del ranking.');
    if (!ok) return;

    setEditAdSaving(true);
    setEditAdError(null);
    try {
      const res = await fetch(`/api/admin/partner/ads?adId=${encodeURIComponent(selectedAd._id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || 'Error'));
      setSelectedAdId('');
      await loadAds();
      await loadBookings();
      setEditAdOpen(false);
    } catch (e: any) {
      setEditAdError(String(e?.message || 'Error'));
    } finally {
      setEditAdSaving(false);
    }
  };

  if (sessionStatus === 'loading') {
    return (
      <main className="max-w-6xl mx-auto py-10 px-4">
        <div className="text-gray-600 dark:text-gray-400">Cargando…</div>
      </main>
    );
  }

  if (sessionStatus !== 'authenticated' || !canAccess) {
    return (
      <main className="max-w-6xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Moderación de Partners</h1>
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-gray-700 dark:text-gray-300">No autorizado.</div>
          <div className="mt-4">
            <Link href="/" className="inline-flex">
              <Button variant="secondary" size="sm">Volver</Button>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Moderación de Partners</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Aprobar antes de mostrar • Top 10 slots</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadAds} disabled={adsLoading}>Recargar anuncios</Button>
          <Button variant="secondary" size="sm" onClick={loadBookings} disabled={bookingsLoading}>Recargar reservas</Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Pendientes: <span className="font-semibold">{stats.pending}</span> • Aprobados: <span className="font-semibold">{stats.approved}</span> • Rechazados: <span className="font-semibold">{stats.rejected}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([
            { k: 'ADS' as const, label: 'Anuncios' },
            { k: 'BOOKINGS' as const, label: 'Reservas' },
            { k: 'PRICING' as const, label: 'Precios' },
            ...(canOverrideSlots ? [{ k: 'OWNER' as const, label: 'Owner' }] : []),
          ] as const).map((t) => {
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                type="button"
                onClick={() => setTab(t.k)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? 'border-minecraft-grass/30 bg-minecraft-grass/10 text-gray-900 dark:text-white'
                    : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'ADS' ? (
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <div className="text-gray-900 dark:text-white font-bold">Anuncios</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Aprobar / rechazar solicitudes</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-44">
                <Select value={adsStatus} onChange={(e) => setAdsStatus(e.target.value as any)}>
                  <option value="PENDING_REVIEW">Pendientes</option>
                  <option value="APPROVED">Aprobados</option>
                  <option value="REJECTED">Rechazados</option>
                </Select>
              </div>
              <Button variant="secondary" size="sm" onClick={loadAds} disabled={adsLoading}>Recargar</Button>
            </div>
          </div>

          {adsError ? <div className="text-sm text-red-600 dark:text-red-300 mb-3">{adsError}</div> : null}

          {!ads.length ? (
            <div className="text-sm text-gray-600 dark:text-gray-400">Sin anuncios para este filtro.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-3">
              <div className="rounded-xl border border-gray-200 bg-white p-2 dark:border-white/10 dark:bg-white/5 max-h-[560px] overflow-auto">
                <div className="space-y-1">
                  {ads.map((a) => {
                    const active = a._id === selectedAdId;
                    return (
                      <button
                        key={a._id}
                        type="button"
                        onClick={() => setSelectedAdId(a._id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                          active
                            ? 'border-minecraft-grass/30 bg-minecraft-grass/10'
                            : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-gray-900 dark:text-white truncate">{a.serverName}</div>
                          {adBadge(a.status)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{a.address}{a.version ? ` • ${a.version}` : ''}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{a.ownerUsername}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
                {!selectedAd ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400">Selecciona una solicitud.</div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-gray-900 dark:text-white truncate">{selectedAd.serverName}</div>
                          {adBadge(selectedAd.status)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {selectedAd.address}{selectedAd.version ? ` • ${selectedAd.version}` : ''}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Owner: {selectedAd.ownerUsername}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">UserId: {selectedAd.userId}</div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => decide(selectedAd._id, 'APPROVE')}
                          disabled={adsLoading || actionLoading || selectedAd.status === 'APPROVED'}
                        >
                          {actionLoading ? 'Procesando…' : 'Aprobar'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => decide(selectedAd._id, 'REJECT')}
                          disabled={adsLoading || actionLoading || selectedAd.status === 'REJECTED' || !String(rejectReason || '').trim()}
                        >
                          Rechazar
                        </Button>
                        {role === 'OWNER' ? (
                          <Button variant="secondary" size="sm" onClick={() => setEditAdOpen(true)} disabled={!selectedAd}>
                            Editar…
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {selectedAd.status !== 'APPROVED' ? (
                      <div className="mt-4">
                        <label className="text-xs text-gray-600 dark:text-gray-400">Motivo de rechazo (obligatorio para rechazar)</label>
                        <Textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={3}
                          maxLength={300}
                          placeholder="Ej: Banner inválido, faltan datos, etc."
                        />
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{String(rejectReason || '').length}/300</div>
                      </div>
                    ) : null}

                    {selectedAd.status === 'REJECTED' && selectedAd.rejectionReason ? (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                        <div className="font-semibold">Motivo de rechazo</div>
                        <div className="opacity-90">{selectedAd.rejectionReason}</div>
                      </div>
                    ) : null}

                    <div className="mt-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedAd.description}</div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                      {selectedAd.website ? (
                        <a href={selectedAd.website} target="_blank" rel="noreferrer" className="text-minecraft-grass hover:underline">
                          Web
                        </a>
                      ) : null}
                      {selectedAd.discord ? (
                        <a href={selectedAd.discord} target="_blank" rel="noreferrer" className="text-minecraft-grass hover:underline">
                          Discord
                        </a>
                      ) : null}
                      {selectedAd.banner ? (
                        <a href={selectedAd.banner} target="_blank" rel="noreferrer" className="text-minecraft-grass hover:underline">
                          Banner
                        </a>
                      ) : null}
                    </div>

                    <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                      Creado: {formatDateTime(selectedAd.createdAt, dateLocale)} • Actualizado: {formatDateTime(selectedAd.updatedAt, dateLocale)}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'BOOKINGS' ? (
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-gray-900 dark:text-white font-bold">Reservas</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Historial y estado de pagos</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-44">
                <Select value={bookingsStatus} onChange={(e) => setBookingsStatus(e.target.value as any)}>
                  <option value="PENDING_OR_ACTIVE">Pendientes + Activas</option>
                  <option value="PENDING">Pendientes</option>
                  <option value="ACTIVE">Activas</option>
                  <option value="EXPIRED">Expiradas</option>
                  <option value="CANCELED">Canceladas</option>
                </Select>
              </div>
              <Button variant="secondary" size="sm" onClick={loadBookings} disabled={bookingsLoading}>Recargar</Button>
            </div>
          </div>

          {bookingsError ? <div className="text-sm text-red-600 dark:text-red-300 mb-3">{bookingsError}</div> : null}

          {!bookings.length ? (
            <div className="text-sm text-gray-600 dark:text-gray-400">Sin reservas.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                    <th className="py-2 pr-4">Estado</th>
                    <th className="py-2 pr-4">Slot</th>
                    <th className="py-2 pr-4">Anuncio</th>
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Pago</th>
                    <th className="py-2 pr-4">Fin</th>
                    <th className="py-2">Creada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {bookings.map((b) => (
                    <tr key={b._id} className="text-gray-700 dark:text-gray-200">
                      <td className="py-3 pr-4">{bookingBadge(b.status)}</td>
                      <td className="py-3 pr-4 font-semibold">#{b.slot}</td>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-gray-900 dark:text-white">{b.ad?.serverName || '—'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{b.ad?.ownerUsername || ''}</div>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400">{b.userId}</td>
                      <td className="py-3 pr-4">{b.provider} • {formatPrice(Number(b.totalPrice || 0), dateLocale, String(b.currency || 'EUR'))}</td>
                      <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400">{b.endsAt ? formatDateTime(b.endsAt, dateLocale) : '—'}</td>
                      <td className="py-3 text-xs text-gray-500 dark:text-gray-400">{formatDateTime(b.createdAt, dateLocale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'PRICING' ? (
        <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <div className="text-gray-900 dark:text-white font-bold">Precios de Partner</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Precios fijos por slot y duración</div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={loadPricing} disabled={pricingLoading || pricingSaving}>Recargar</Button>
              <Button variant="primary" size="sm" onClick={() => setPricingOpen(true)} disabled={pricingLoading || !pricing}>Editar…</Button>
            </div>
          </div>

          {pricingError ? <div className="text-sm text-red-600 dark:text-red-300 mb-3">{pricingError}</div> : null}

          {!pricing ? (
            <div className="text-sm text-gray-600 dark:text-gray-400">{pricingLoading ? 'Cargando…' : 'No hay configuración.'}</div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Precios fijos por días</span> (1–{PARTNER_MAX_DAYS})
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Vista previa rápida</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-28">
                  <Select value={String(pricingDay)} onChange={(e) => setPricingDay(Number(e.target.value || 1))}>
                    {Array.from({ length: PARTNER_MAX_DAYS }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>{d}d</option>
                    ))}
                  </Select>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Slot #1 {Number(pricing.slotTotalsEur?.[0]?.[pricingDay - 1] || 0)}€ • Slot #10 {Number(pricing.slotTotalsEur?.[9]?.[pricingDay - 1] || 0)}€
                </div>
              </div>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'OWNER' && canOverrideSlots ? (
        <div className="space-y-4">
          <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-gray-900 dark:text-white font-bold">Asignación manual de slots</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Solo OWNER • Prioridad sobre reservas activas</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={loadOverrides} disabled={overridesLoading || overridesSaving}>Recargar</Button>
                <Button variant="primary" size="sm" onClick={() => setOverridesOpen(true)} disabled={overridesLoading}>Editar…</Button>
              </div>
            </div>

            {overridesError ? <div className="mt-3 text-sm text-red-600 dark:text-red-300">{overridesError}</div> : null}
          </Card>

          <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-gray-900 dark:text-white font-bold">Crear anuncio interno</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Solo OWNER • Para asignación manual</div>
              </div>
              <Button variant="primary" size="sm" onClick={() => setSystemAdOpen(true)}>Crear…</Button>
            </div>

            {systemAdError ? <div className="mt-3 text-sm text-red-600 dark:text-red-300">{systemAdError}</div> : null}
          </Card>
        </div>
      ) : null}

      <Modal open={pricingOpen} title="Editar precios" onClose={() => setPricingOpen(false)}>
        {pricingError ? <div className="text-sm text-red-600 dark:text-red-300 mb-3">{pricingError}</div> : null}

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Día</label>
              <Select value={String(pricingDay)} onChange={(e) => setPricingDay(Number(e.target.value || 1))}>
                {Array.from({ length: PARTNER_MAX_DAYS }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d)}>{d} día{d === 1 ? '' : 's'}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPricingOpen(false)} disabled={pricingSaving}>Cancelar</Button>
              <Button variant="primary" size="sm" onClick={savePricing} disabled={!pricing || pricingLoading || pricingSaving}>
                {pricingSaving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Editas el precio total de ese día para cada slot (EUR).
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Array.from({ length: PARTNER_SLOTS }, (_, i) => i + 1).map((slot) => {
              const slotIdx = slot - 1;
              const dayIdx = Math.min(PARTNER_MAX_DAYS, Math.max(1, pricingDay)) - 1;
              const v = Number(pricing?.slotTotalsEur?.[slotIdx]?.[dayIdx] ?? 0);
              return (
                <div key={slot}>
                  <label className="text-xs text-gray-600 dark:text-gray-400">Slot #{slot}</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={String(Number.isFinite(v) ? v : 0)}
                    onChange={(e) => {
                      const nextRaw = e.target.value;
                      const cleaned = nextRaw.trim();
                      const nextNum = cleaned === '' ? 0 : Number(cleaned.replace(',', '.'));
                      const next = Number.isFinite(nextNum) ? Math.max(0, Math.round(nextNum * 100) / 100) : 0;
                      setPricing((p) => {
                        if (!p) return p;
                        const totals = Array.isArray(p.slotTotalsEur) ? p.slotTotalsEur.map((r) => (Array.isArray(r) ? [...r] : [])) : [];
                        while (totals.length < PARTNER_SLOTS) totals.push(Array(PARTNER_MAX_DAYS).fill(0));
                        for (let si = 0; si < PARTNER_SLOTS; si++) {
                          while (totals[si].length < PARTNER_MAX_DAYS) totals[si].push(0);
                        }
                        totals[slotIdx][dayIdx] = next;
                        return { ...p, slotTotalsEur: totals };
                      });
                    }}
                    disabled={pricingSaving}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      <Modal open={overridesOpen} title="Asignación manual de slots" onClose={() => setOverridesOpen(false)}>
        {overridesError ? <div className="text-sm text-red-600 dark:text-red-300 mb-3">{overridesError}</div> : null}

        <div className="flex items-center justify-end gap-2 mb-4">
          <Button variant="secondary" size="sm" onClick={() => setOverridesOpen(false)} disabled={overridesSaving}>Cancelar</Button>
          <Button variant="primary" size="sm" onClick={saveOverrides} disabled={overridesLoading || overridesSaving}>
            {overridesSaving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: PARTNER_SLOTS }, (_, i) => i + 1).map((slot) => {
            const idx = slot - 1;
            const value = String(slotOverrides[idx] || '');
            return (
              <div key={slot}>
                <label className="text-xs text-gray-600 dark:text-gray-400">Slot #{slot}</label>
                <Select
                  value={value}
                  onChange={(e) => {
                    const nextId = String(e.target.value || '').trim();
                    setSlotOverrides((prev) => {
                      const copy = [...prev];
                      copy[idx] = nextId;
                      return copy;
                    });
                  }}
                  disabled={overridesLoading || overridesSaving}
                >
                  <option value="">— Automático (reserva activa) —</option>
                  {approvedAds.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.serverName} — {a.ownerUsername}
                    </option>
                  ))}
                </Select>
              </div>
            );
          })}
        </div>
      </Modal>

      <Modal open={systemAdOpen} title="Crear anuncio (OWNER)" onClose={() => setSystemAdOpen(false)}>
        {systemAdError ? <div className="text-sm text-red-600 dark:text-red-300 mb-3">{systemAdError}</div> : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400">Autor (ownerUsername)</label>
            <Input value={systemAdForm.ownerUsername} onChange={(e) => setSystemAdForm((p) => ({ ...p, ownerUsername: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400">Versión (opcional)</label>
            <Input value={systemAdForm.version} onChange={(e) => setSystemAdForm((p) => ({ ...p, version: e.target.value }))} placeholder="1.20.x" />
          </div>
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400">Nombre del servidor</label>
            <Input value={systemAdForm.serverName} onChange={(e) => setSystemAdForm((p) => ({ ...p, serverName: e.target.value }))} placeholder="Mi servidor" />
          </div>
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400">IP / Dominio</label>
            <Input value={systemAdForm.address} onChange={(e) => setSystemAdForm((p) => ({ ...p, address: e.target.value }))} placeholder="play.ejemplo.com" />
          </div>
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400">Banner (URL, opcional)</label>
            <Input value={systemAdForm.banner} onChange={(e) => setSystemAdForm((p) => ({ ...p, banner: e.target.value }))} placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400">Web (opcional)</label>
            <Input value={systemAdForm.website} onChange={(e) => setSystemAdForm((p) => ({ ...p, website: e.target.value }))} placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400">Discord (opcional)</label>
            <Input value={systemAdForm.discord} onChange={(e) => setSystemAdForm((p) => ({ ...p, discord: e.target.value }))} placeholder="https://discord.gg/..." />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-600 dark:text-gray-400">Descripción</label>
            <Textarea
              value={systemAdForm.description}
              onChange={(e) => setSystemAdForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Cuenta qué ofrece tu servidor, modalidad, comunidad..."
              rows={4}
              minLength={20}
              maxLength={500}
            />
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{systemAdForm.description.length}/500</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setSystemAdOpen(false)} disabled={systemAdCreating}>Cancelar</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={createSystemAd}
            disabled={systemAdCreating || !systemAdForm.serverName.trim() || !systemAdForm.address.trim() || systemAdForm.description.trim().length < 20}
          >
            {systemAdCreating ? 'Creando…' : 'Crear'}
          </Button>
        </div>
      </Modal>

      <Modal open={editAdOpen} title="Editar anuncio" onClose={() => setEditAdOpen(false)}>
        {!selectedAd ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">Selecciona un anuncio para editar.</div>
        ) : (
          <>
            {editAdError ? <div className="text-sm text-red-600 dark:text-red-300 mb-3">{editAdError}</div> : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Owner</label>
                <Input value={editAdForm.ownerUsername} onChange={(e) => setEditAdForm((p) => ({ ...p, ownerUsername: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Nombre del servidor</label>
                <Input value={editAdForm.serverName} onChange={(e) => setEditAdForm((p) => ({ ...p, serverName: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">IP / Dominio</label>
                <Input value={editAdForm.address} onChange={(e) => setEditAdForm((p) => ({ ...p, address: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Versión (opcional)</label>
                <Input value={editAdForm.version} onChange={(e) => setEditAdForm((p) => ({ ...p, version: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Web (opcional)</label>
                <Input value={editAdForm.website} onChange={(e) => setEditAdForm((p) => ({ ...p, website: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Discord (opcional)</label>
                <Input value={editAdForm.discord} onChange={(e) => setEditAdForm((p) => ({ ...p, discord: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">Banner (URL, opcional)</label>
                <Input value={editAdForm.banner} onChange={(e) => setEditAdForm((p) => ({ ...p, banner: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">Descripción</label>
                <Textarea value={editAdForm.description} onChange={(e) => setEditAdForm((p) => ({ ...p, description: e.target.value }))} rows={4} maxLength={500} />
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{editAdForm.description.length}/500</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditAdOpen(false)} disabled={editAdSaving}>Cancelar</Button>
              <Button variant="secondary" size="sm" onClick={deleteSelectedAd} disabled={editAdSaving || adsLoading || actionLoading}>
                Eliminar
              </Button>
              <Button variant="primary" size="sm" onClick={saveSelectedAd} disabled={editAdSaving || adsLoading || actionLoading}>
                {editAdSaving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </main>
  );
}
