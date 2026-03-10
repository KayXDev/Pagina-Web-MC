'use client';

import { useCallback, useEffect, useState } from 'react';
import { FaPercent, FaPlus, FaTrash } from 'react-icons/fa';
import { Card, Button, Input, Select, Badge } from '@/components/ui';
import { toast } from 'react-toastify';
import { useClientLang } from '@/lib/useClientLang';

type Coupon = {
  _id: string;
  code: string;
  description?: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  active: boolean;
  minOrderTotal?: number;
  maxUses?: number;
  usedCount?: number;
  expiresAt?: string;
  appliesToProductIds?: string[];
};

type Product = {
  _id: string;
  name: string;
};

export default function AdminCouponsPage() {
  const lang = useClientLang();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [couponWebhook, setCouponWebhook] = useState('');
  const [form, setForm] = useState({
    code: '',
    description: '',
    type: 'PERCENT' as 'PERCENT' | 'FIXED',
    value: '10',
    minOrderTotal: '0',
    maxUses: '',
    expiresAt: '',
    productId: '',
  });

  const productNameById = new Map(products.map((p) => [String(p._id), String(p.name || p._id)]));

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coupons', { cache: 'no-store' });
      const data = await res.json().catch(() => ([]));
      if (!res.ok) throw new Error((data as any).error || (lang === 'es' ? 'Error' : 'Error'));
      setCoupons(Array.isArray(data) ? (data as Coupon[]) : []);
    } catch (err: any) {
      toast.error(err?.message || (lang === 'es' ? 'Error cargando cupones' : 'Error loading coupons'));
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    void fetchCoupons();

    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products', { cache: 'no-store' });
        const data = await res.json().catch(() => ([]));
        if (!res.ok) return;
        setProducts(Array.isArray(data) ? (data as Product[]) : []);
      } catch {
        // ignore
      }
    };

    void fetchProducts();

    const fetchWebhook = async () => {
      try {
        const res = await fetch('/api/admin/settings', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        setCouponWebhook(String((data as any)?.shop_coupon_discord_webhook || ''));
      } catch {
        // ignore
      }
    };

    void fetchWebhook();
  }, [fetchCoupons]);

  const saveCouponWebhook = async () => {
    setSavingWebhook(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_coupon_discord_webhook: couponWebhook.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || (lang === 'es' ? 'Error' : 'Error'));
      toast.success(lang === 'es' ? 'Webhook de cupones guardado' : 'Coupon webhook saved');
      setCouponWebhook(String(couponWebhook || '').trim());
    } catch (err: any) {
      toast.error(err?.message || (lang === 'es' ? 'Error guardando webhook de cupones' : 'Error saving coupon webhook'));
    } finally {
      setSavingWebhook(false);
    }
  };

  const testCouponWebhook = async () => {
    setTestingWebhook(true);
    try {
      const res = await fetch('/api/admin/coupons/webhook-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || (lang === 'es' ? 'Error' : 'Error'));
      toast.success(lang === 'es' ? 'Webhook de prueba enviado' : 'Coupon test webhook sent');
    } catch (err: any) {
      toast.error(err?.message || (lang === 'es' ? 'Error enviando webhook de prueba' : 'Error sending coupon test webhook'));
    } finally {
      setTestingWebhook(false);
    }
  };

  const createCoupon = async () => {
    setSaving(true);
    try {
      const payload: any = {
        code: form.code,
        description: form.description,
        type: form.type,
        value: Number(form.value || 0),
        minOrderTotal: Number(form.minOrderTotal || 0),
      };
      if (form.productId.trim()) payload.appliesToProductIds = [form.productId.trim()];
      if (form.maxUses.trim()) payload.maxUses = Number(form.maxUses);
      if (form.expiresAt.trim()) payload.expiresAt = new Date(form.expiresAt).toISOString();

      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || (lang === 'es' ? 'Error' : 'Error'));

      toast.success(lang === 'es' ? 'Cupón creado' : 'Coupon created');
      setForm({ code: '', description: '', type: 'PERCENT', value: '10', minOrderTotal: '0', maxUses: '', expiresAt: '', productId: '' });
      fetchCoupons();
    } catch (err: any) {
      toast.error(err?.message || (lang === 'es' ? 'Error creando cupón' : 'Error creating coupon'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: coupon._id, active: !coupon.active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || (lang === 'es' ? 'Error' : 'Error'));
      fetchCoupons();
    } catch (err: any) {
      toast.error(err?.message || (lang === 'es' ? 'Error actualizando cupón' : 'Error updating coupon'));
    }
  };

  const removeCoupon = async (id: string) => {
    if (!confirm(lang === 'es' ? '¿Eliminar este cupón?' : 'Delete this coupon?')) return;
    try {
      const res = await fetch(`/api/admin/coupons?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || (lang === 'es' ? 'Error' : 'Error'));
      fetchCoupons();
    } catch (err: any) {
      toast.error(err?.message || (lang === 'es' ? 'Error eliminando cupón' : 'Error deleting coupon'));
    }
  };

  return (
    <div className="space-y-6">
      <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-11 w-11 rounded-xl bg-gray-100 border border-gray-200 grid place-items-center text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-white">
            <FaPercent />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{lang === 'es' ? 'Cupones' : 'Coupons'}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {lang === 'es' ? 'Crea y controla cupones de descuento para el checkout.' : 'Create and control discount coupons for checkout.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="CODE10" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
          <Select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as any }))}>
            <option value="PERCENT">{lang === 'es' ? 'Porcentaje (%)' : 'Percent (%)'}</option>
            <option value="FIXED">{lang === 'es' ? 'Cantidad fija' : 'Fixed amount'}</option>
          </Select>
          <Input type="number" min="0" placeholder={lang === 'es' ? 'Valor' : 'Value'} value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} />
          <Input placeholder={lang === 'es' ? 'Descripción' : 'Description'} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <Input type="number" min="0" placeholder={lang === 'es' ? 'Pedido mínimo' : 'Min order total'} value={form.minOrderTotal} onChange={(e) => setForm((p) => ({ ...p, minOrderTotal: e.target.value }))} />
          <Input type="number" min="1" placeholder={lang === 'es' ? 'Usos máximos (opcional)' : 'Max uses (optional)'} value={form.maxUses} onChange={(e) => setForm((p) => ({ ...p, maxUses: e.target.value }))} />
          <Input type="datetime-local" placeholder={lang === 'es' ? 'Expira en' : 'Expires at'} value={form.expiresAt} onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))} />
          <Select value={form.productId} onChange={(e) => setForm((p) => ({ ...p, productId: e.target.value }))}>
            <option value="">{lang === 'es' ? 'Cupón general (todos los productos)' : 'General coupon (all products)'}</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </Select>
        </div>

        <div className="mt-3 flex justify-end">
          <Button type="button" onClick={createCoupon} disabled={saving || !form.code.trim()}>
            <FaPlus />
            <span>{saving ? (lang === 'es' ? 'Guardando...' : 'Saving...') : (lang === 'es' ? 'Crear cupón' : 'Create coupon')}</span>
          </Button>
        </div>
      </Card>

      <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
        <div className="text-gray-900 dark:text-white font-semibold mb-2">
          {lang === 'es' ? 'Webhook de uso de cupones (Discord)' : 'Coupon usage webhook (Discord)'}
        </div>
        <Input
          type="text"
          value={couponWebhook}
          onChange={(e) => setCouponWebhook(e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
        />
        <div className="mt-3 flex flex-col md:flex-row gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={testCouponWebhook} disabled={testingWebhook || !couponWebhook.trim()}>
            <span>{testingWebhook ? (lang === 'es' ? 'Enviando prueba...' : 'Sending test...') : (lang === 'es' ? 'Enviar prueba' : 'Send test')}</span>
          </Button>
          <Button type="button" onClick={saveCouponWebhook} disabled={savingWebhook}>
            <span>{savingWebhook ? (lang === 'es' ? 'Guardando...' : 'Saving...') : (lang === 'es' ? 'Guardar webhook' : 'Save webhook')}</span>
          </Button>
        </div>
      </Card>

      <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
        {loading ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">{lang === 'es' ? 'Cargando...' : 'Loading...'}</div>
        ) : coupons.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">{lang === 'es' ? 'Aún no hay cupones.' : 'No coupons yet.'}</div>
        ) : (
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c._id} className="rounded-xl border border-gray-200 dark:border-white/10 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-gray-900 dark:text-white">{c.code}</div>
                    <Badge variant={c.active ? 'success' : 'default'}>{c.active ? (lang === 'es' ? 'ACTIVO' : 'ACTIVE') : 'OFF'}</Badge>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {c.type} {c.value} | {lang === 'es' ? 'Usado' : 'Used'}: {Number(c.usedCount || 0)}{c.maxUses ? `/${c.maxUses}` : ''}
                    {c.expiresAt ? ` | ${lang === 'es' ? 'Expira' : 'Expires'}: ${new Date(c.expiresAt).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US')}` : ''}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {lang === 'es' ? 'Ámbito' : 'Scope'}:{' '}
                    {Array.isArray(c.appliesToProductIds) && c.appliesToProductIds.length > 0
                      ? `${lang === 'es' ? 'Producto específico' : 'Specific product'} (${productNameById.get(String(c.appliesToProductIds[0])) || c.appliesToProductIds[0]})`
                      : lang === 'es'
                        ? 'General (todos los productos)'
                        : 'General (all products)'}
                  </div>
                  {c.description ? <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{c.description}</div> : null}
                </div>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => toggleActive(c)}>
                    <span>{c.active ? (lang === 'es' ? 'Desactivar' : 'Disable') : (lang === 'es' ? 'Activar' : 'Enable')}</span>
                  </Button>
                  <Button type="button" variant="danger" onClick={() => removeCoupon(c._id)}>
                    <FaTrash />
                    <span>{lang === 'es' ? 'Eliminar' : 'Delete'}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
