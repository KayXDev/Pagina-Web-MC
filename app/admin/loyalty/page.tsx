'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaAward, FaCoins, FaGift, FaSearch, FaSyncAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Badge, Button, Card, Input } from '@/components/ui';
import { useClientLang } from '@/lib/useClientLang';
import { formatDateTime } from '@/lib/utils';

type LoyaltyUser = {
  _id: string;
  username: string;
  email: string;
  role: string;
  loyaltyPoints: number;
  loyaltyLifetimePoints: number;
  loyaltyLastEarnedAt?: string | null;
};

type LoyaltyEvent = {
  _id: string;
  userId: string;
  username: string;
  type: string;
  points: number;
  amountSpent: number;
  currency: string;
  description: string;
  createdAt?: string | null;
};

type LoyaltyPayload = {
  config: {
    earningPointsPerEuro: number;
    redemptionPointsPerEuro: number;
    balancePointsPerEuro: number;
  };
  summary: {
    totalPoints: number;
    totalLifetimePoints: number;
    usersWithPoints: number;
    totalEvents: number;
  };
  users: LoyaltyUser[];
  recentEvents: LoyaltyEvent[];
};

export default function AdminLoyaltyPage() {
  const lang = useClientLang();
  const [payload, setPayload] = useState<LoyaltyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editPoints, setEditPoints] = useState('0');
  const [editLifetimePoints, setEditLifetimePoints] = useState('0');
  const [sendPoints, setSendPoints] = useState('100');
  const [earningPointsPerEuro, setEarningPointsPerEuro] = useState('10');
  const [redemptionPointsPerEuro, setRedemptionPointsPerEuro] = useState('100');
  const [balancePointsPerEuro, setBalancePointsPerEuro] = useState('100');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/loyalty', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((data as any).error || 'Error');
      const nextPayload = data as LoyaltyPayload;
      setPayload(nextPayload);
      setEarningPointsPerEuro(String(nextPayload.config?.earningPointsPerEuro ?? 10));
      setRedemptionPointsPerEuro(String(nextPayload.config?.redemptionPointsPerEuro ?? 100));
      setBalancePointsPerEuro(String(nextPayload.config?.balancePointsPerEuro ?? 100));

      if (!selectedUserId && Array.isArray(nextPayload.users) && nextPayload.users.length > 0) {
        const first = nextPayload.users[0];
        setSelectedUserId(first._id);
        setEditPoints(String(first.loyaltyPoints || 0));
        setEditLifetimePoints(String(first.loyaltyLifetimePoints || 0));
      }
    } catch (error: any) {
      toast.error(error?.message || (lang === 'es' ? 'Error al cargar loyalty' : 'Failed to load loyalty'));
      setPayload(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const users = useMemo(() => payload?.users || [], [payload]);
  const recentEvents = useMemo(() => payload?.recentEvents || [], [payload]);
  const summary = useMemo(
    () => payload?.summary || { totalPoints: 0, totalLifetimePoints: 0, usersWithPoints: 0, totalEvents: 0 },
    [payload]
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => [user.username, user.email, user.role].join(' ').toLowerCase().includes(query));
  }, [search, users]);

  const selectedUser = useMemo(() => {
    return users.find((user) => user._id === selectedUserId) || null;
  }, [selectedUserId, users]);

  useEffect(() => {
    if (!selectedUser) return;
    setEditPoints(String(selectedUser.loyaltyPoints || 0));
    setEditLifetimePoints(String(selectedUser.loyaltyLifetimePoints || 0));
  }, [selectedUser]);

  const saveUser = async () => {
    if (!selectedUser) return;

    const nextPoints = Math.max(0, Math.floor(Number(editPoints || 0)));
    const nextLifetimePoints = Math.max(nextPoints, Math.floor(Number(editLifetimePoints || nextPoints)));

    setSaving(true);
    try {
      const response = await fetch('/api/admin/loyalty', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser._id,
          loyaltyPoints: nextPoints,
          loyaltyLifetimePoints: nextLifetimePoints,
          note,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((data as any).error || 'Error');

      toast.success(lang === 'es' ? 'Loyalty actualizada' : 'Loyalty updated');
      setNote('');
      await fetchData();
    } catch (error: any) {
      toast.error(error?.message || (lang === 'es' ? 'No se pudo guardar' : 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  const sendPointsToUser = async () => {
    if (!selectedUser) return;

    const pointsToSend = Math.max(1, Math.floor(Number(sendPoints || 0)));
    if (!Number.isFinite(pointsToSend) || pointsToSend <= 0) {
      toast.error(lang === 'es' ? 'Cantidad inválida' : 'Invalid amount');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/loyalty', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          userId: selectedUser._id,
          pointsToSend,
          note,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((data as any).error || 'Error');

      toast.success(lang === 'es' ? 'Puntos enviados' : 'Points sent');
      setSendPoints('100');
      setNote('');
      await fetchData();
    } catch (error: any) {
      toast.error(error?.message || (lang === 'es' ? 'No se pudieron enviar los puntos' : 'Could not send points'));
    } finally {
      setSaving(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/loyalty', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_config',
          earningPointsPerEuro: Math.max(1, Math.floor(Number(earningPointsPerEuro || 0))),
          redemptionPointsPerEuro: Math.max(1, Math.floor(Number(redemptionPointsPerEuro || 0))),
          balancePointsPerEuro: Math.max(1, Math.floor(Number(balancePointsPerEuro || 0))),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((data as any).error || 'Error');
      toast.success(lang === 'es' ? 'Configuración loyalty guardada' : 'Loyalty configuration saved');
      await fetchData();
    } catch (error: any) {
      toast.error(error?.message || (lang === 'es' ? 'No se pudo guardar la configuración' : 'Could not save configuration'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25" hover={false}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-gray-200 bg-gray-50 text-minecraft-gold dark:border-white/10 dark:bg-white/5">
              <FaAward className="text-xl" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
                {lang === 'es' ? 'Control loyalty' : 'Loyalty control'}
              </div>
              <h1 className="mt-2 text-2xl font-black text-gray-900 dark:text-white md:text-3xl">
                {lang === 'es' ? 'Loyalty points' : 'Loyalty points'}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
                {lang === 'es'
                  ? 'Administra saldos, revisa actividad reciente y ajusta puntos desde una sola vista.'
                  : 'Manage balances, review recent activity, and adjust points from a single view.'}
              </p>
            </div>
          </div>

          <Button type="button" variant="secondary" onClick={fetchData} disabled={refreshing} className="rounded-2xl">
            <FaSyncAlt />
            <span>{refreshing ? (lang === 'es' ? 'Actualizando...' : 'Refreshing...') : (lang === 'es' ? 'Actualizar' : 'Refresh')}</span>
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card hover={false} className="rounded-[28px] dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Puntos vivos' : 'Live points'}</div>
          <div className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{summary.totalPoints}</div>
        </Card>
        <Card hover={false} className="rounded-[28px] dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Histórico total' : 'Lifetime total'}</div>
          <div className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{summary.totalLifetimePoints}</div>
        </Card>
        <Card hover={false} className="rounded-[28px] dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Usuarios con puntos' : 'Users with points'}</div>
          <div className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{summary.usersWithPoints}</div>
        </Card>
        <Card hover={false} className="rounded-[28px] dark:border-white/10 dark:bg-gray-950/25">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Eventos recientes' : 'Recent events'}</div>
          <div className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{summary.totalEvents}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1.2fr]">
        <Card hover={false} className="rounded-[28px] dark:border-white/10 dark:bg-gray-950/25">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Usuarios' : 'Users'}</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es' ? 'Selecciona a quién quieres ajustar.' : 'Select a user to adjust.'}
              </div>
            </div>
            <div className="w-full max-w-xs">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" placeholder={lang === 'es' ? 'Buscar usuario...' : 'Search user...'} />
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2 max-h-[30rem] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-sm text-gray-500">{lang === 'es' ? 'Cargando...' : 'Loading...'}</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-sm text-gray-500">{lang === 'es' ? 'No hay usuarios' : 'No users found'}</div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => setSelectedUserId(user._id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                    selectedUserId === user._id
                      ? 'border-minecraft-grass/40 bg-minecraft-grass/10'
                      : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-gray-900 dark:text-white">{user.username}</div>
                      <div className="truncate text-xs text-gray-500">{user.email}</div>
                    </div>
                    <Badge variant="info">{user.role}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span>{lang === 'es' ? 'Actual' : 'Current'}: {user.loyaltyPoints} pts</span>
                    <span>{lang === 'es' ? 'Histórico' : 'Lifetime'}: {user.loyaltyLifetimePoints} pts</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card hover={false} className="rounded-[28px] dark:border-white/10 dark:bg-gray-950/25">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Configuración de loyalty' : 'Loyalty configuration'}</div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {lang === 'es'
                    ? 'Ajusta cuánto se gana, cuánto cuesta canjear y cuánto cuesta convertir puntos a saldo de tienda.'
                    : 'Adjust earning, redemption, and points-to-store-balance conversion from one place.'}
                </div>
              </div>
              <Badge variant="warning">{lang === 'es' ? 'Global' : 'Global'}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Puntos ganados por 1€' : 'Points earned per €1'}</label>
                <Input type="number" min={1} step={1} value={earningPointsPerEuro} onChange={(e) => setEarningPointsPerEuro(e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Puntos para canjear 1€' : 'Points to redeem €1'}</label>
                <Input type="number" min={1} step={1} value={redemptionPointsPerEuro} onChange={(e) => setRedemptionPointsPerEuro(e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Puntos para convertir 1€ a saldo' : 'Points to convert €1 to balance'}</label>
                <Input type="number" min={1} step={1} value={balancePointsPerEuro} onChange={(e) => setBalancePointsPerEuro(e.target.value)} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                {lang === 'es' ? `Compra de 10€ = ${Math.max(1, Math.floor(Number(earningPointsPerEuro || 0) || 0)) * 10} puntos` : `€10 order = ${Math.max(1, Math.floor(Number(earningPointsPerEuro || 0) || 0)) * 10} points`}
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                {lang === 'es' ? `${Math.max(1, Math.floor(Number(redemptionPointsPerEuro || 0) || 0))} puntos = 1€ de descuento` : `${Math.max(1, Math.floor(Number(redemptionPointsPerEuro || 0) || 0))} points = €1 discount`}
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                {lang === 'es' ? `${Math.max(1, Math.floor(Number(balancePointsPerEuro || 0) || 0))} puntos = 1€ de saldo` : `${Math.max(1, Math.floor(Number(balancePointsPerEuro || 0) || 0))} points = €1 balance`}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" onClick={saveConfig} disabled={saving} className="rounded-2xl">
                <FaCoins />
                <span>{saving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : (lang === 'es' ? 'Guardar configuración' : 'Save configuration')}</span>
              </Button>
            </div>
          </Card>

          <Card hover={false} className="rounded-[28px] dark:border-white/10 dark:bg-gray-950/25">
            {!selectedUser ? (
              <div className="text-sm text-gray-500">{lang === 'es' ? 'Selecciona un usuario para editar loyalty.' : 'Select a user to edit loyalty.'}</div>
            ) : (
              <>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Editor de puntos' : 'Points editor'}</div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {selectedUser.username} · {selectedUser.email}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="info">{selectedUser.loyaltyPoints} pts</Badge>
                    <Badge variant="warning">{selectedUser.loyaltyLifetimePoints} lifetime</Badge>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Puntos actuales' : 'Current points'}</label>
                    <Input type="number" min={0} step={1} value={editPoints} onChange={(e) => setEditPoints(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Puntos históricos' : 'Lifetime points'}</label>
                    <Input type="number" min={0} step={1} value={editLifetimePoints} onChange={(e) => setEditLifetimePoints(e.target.value)} />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Nota del ajuste' : 'Adjustment note'}</label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={lang === 'es' ? 'Ej: bonus por evento, corrección manual...' : 'e.g. event bonus, manual correction...'} />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Último abono' : 'Last reward'}</div>
                    <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{selectedUser.loyaltyLastEarnedAt ? formatDateTime(selectedUser.loyaltyLastEarnedAt) : '-'}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Delta</div>
                    <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{Math.max(0, Math.floor(Number(editPoints || 0))) - selectedUser.loyaltyPoints} pts</div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Delta histórico' : 'Lifetime delta'}</div>
                    <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{Math.max(Math.max(0, Math.floor(Number(editPoints || 0))), Math.floor(Number(editLifetimePoints || 0))) - selectedUser.loyaltyLifetimePoints} pts</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button type="button" onClick={saveUser} disabled={saving} className="rounded-2xl">
                    <FaCoins />
                    <span>{saving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : (lang === 'es' ? 'Guardar ajuste' : 'Save adjustment')}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => {
                      if (!selectedUser) return;
                      setEditPoints(String(selectedUser.loyaltyPoints || 0));
                      setEditLifetimePoints(String(selectedUser.loyaltyLifetimePoints || 0));
                      setNote('');
                    }}
                  >
                    {lang === 'es' ? 'Restablecer formulario' : 'Reset form'}
                  </Button>
                </div>

                <div className="mt-6 rounded-[24px] border border-minecraft-gold/20 bg-minecraft-gold/5 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Enviar puntos' : 'Send points'}</div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {lang === 'es'
                          ? 'Usa esto para regalar o compensar puntos sin tocar el ajuste manual completo.'
                          : 'Use this to grant or compensate points without editing the full balance manually.'}
                      </div>
                    </div>
                    <Badge variant="warning">{lang === 'es' ? 'Suma directa' : 'Direct grant'}</Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr]">
                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-500">{lang === 'es' ? 'Cantidad' : 'Amount'}</label>
                      <Input type="number" min={1} step={1} value={sendPoints} onChange={(e) => setSendPoints(e.target.value)} />
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                      {lang === 'es'
                        ? `Se añadirán ${Math.max(1, Math.floor(Number(sendPoints || 0) || 0))} puntos al saldo actual y también al histórico del usuario.`
                        : `${Math.max(1, Math.floor(Number(sendPoints || 0) || 0))} points will be added to the user's current and lifetime totals.`}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button type="button" variant="secondary" onClick={sendPointsToUser} disabled={saving} className="rounded-2xl">
                      <FaGift />
                      <span>{saving ? (lang === 'es' ? 'Enviando...' : 'Sending...') : (lang === 'es' ? 'Enviar puntos' : 'Send points')}</span>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>

          <Card hover={false} className="rounded-[28px] dark:border-white/10 dark:bg-gray-950/25">
            <div className="flex items-center gap-3">
              <FaGift className="text-minecraft-gold" />
              <div className="text-sm font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Actividad reciente de loyalty' : 'Recent loyalty activity'}</div>
            </div>

            <div className="mt-4 space-y-3">
              {recentEvents.length === 0 ? (
                <div className="text-sm text-gray-500">{lang === 'es' ? 'No hay actividad reciente.' : 'No recent activity.'}</div>
              ) : (
                recentEvents.map((event) => (
                  <div key={event._id} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{event.username}</div>
                        <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{event.description}</div>
                        <div className="mt-1 text-xs text-gray-500">{event.createdAt ? formatDateTime(event.createdAt) : '-'}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${event.points >= 0 ? 'text-minecraft-grass' : 'text-minecraft-redstone'}`}>
                          {event.points > 0 ? '+' : ''}{event.points} pts
                        </div>
                        <div className="text-xs text-gray-500">{event.type}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
