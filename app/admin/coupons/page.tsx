'use client';

import { useEffect, useState } from 'react';
import { FaPercent, FaPlus, FaTrash } from 'react-icons/fa';
import { Card, Button, Input, Select, Badge } from '@/components/ui';
import { toast } from 'react-toastify';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coupons', { cache: 'no-store' });
      const data = await res.json().catch(() => ([]));
      if (!res.ok) throw new Error((data as any).error || 'Error');
      setCoupons(Array.isArray(data) ? (data as Coupon[]) : []);
    } catch (err: any) {
      toast.error(err?.message || 'Error loading coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();

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

    fetchProducts();
  }, []);

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
      if (!res.ok) throw new Error((data as any).error || 'Error');

      toast.success('Coupon created');
      setForm({ code: '', description: '', type: 'PERCENT', value: '10', minOrderTotal: '0', maxUses: '', expiresAt: '', productId: '' });
      fetchCoupons();
    } catch (err: any) {
      toast.error(err?.message || 'Error creating coupon');
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
      if (!res.ok) throw new Error((data as any).error || 'Error');
      fetchCoupons();
    } catch (err: any) {
      toast.error(err?.message || 'Error updating coupon');
    }
  };

  const removeCoupon = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      const res = await fetch(`/api/admin/coupons?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');
      fetchCoupons();
    } catch (err: any) {
      toast.error(err?.message || 'Error deleting coupon');
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Coupons</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Create and control discount coupons for checkout.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="CODE10" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
          <Select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as any }))}>
            <option value="PERCENT">Percent (%)</option>
            <option value="FIXED">Fixed amount</option>
          </Select>
          <Input type="number" min="0" placeholder="Value" value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))} />
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <Input type="number" min="0" placeholder="Min order total" value={form.minOrderTotal} onChange={(e) => setForm((p) => ({ ...p, minOrderTotal: e.target.value }))} />
          <Input type="number" min="1" placeholder="Max uses (optional)" value={form.maxUses} onChange={(e) => setForm((p) => ({ ...p, maxUses: e.target.value }))} />
          <Input type="datetime-local" placeholder="Expires at" value={form.expiresAt} onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))} />
          <Select value={form.productId} onChange={(e) => setForm((p) => ({ ...p, productId: e.target.value }))}>
            <option value="">General coupon (all products)</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </Select>
        </div>

        <div className="mt-3 flex justify-end">
          <Button type="button" onClick={createCoupon} disabled={saving || !form.code.trim()}>
            <FaPlus />
            <span>{saving ? 'Saving...' : 'Create coupon'}</span>
          </Button>
        </div>
      </Card>

      <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
        {loading ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">Loading...</div>
        ) : coupons.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">No coupons yet.</div>
        ) : (
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c._id} className="rounded-xl border border-gray-200 dark:border-white/10 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-gray-900 dark:text-white">{c.code}</div>
                    <Badge variant={c.active ? 'success' : 'default'}>{c.active ? 'ACTIVE' : 'OFF'}</Badge>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {c.type} {c.value} | Used: {Number(c.usedCount || 0)}{c.maxUses ? `/${c.maxUses}` : ''}
                    {c.expiresAt ? ` | Expires: ${new Date(c.expiresAt).toLocaleString()}` : ''}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Scope:{' '}
                    {Array.isArray(c.appliesToProductIds) && c.appliesToProductIds.length > 0
                      ? `Specific product (${productNameById.get(String(c.appliesToProductIds[0])) || c.appliesToProductIds[0]})`
                      : 'General (all products)'}
                  </div>
                  {c.description ? <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{c.description}</div> : null}
                </div>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => toggleActive(c)}>
                    <span>{c.active ? 'Disable' : 'Enable'}</span>
                  </Button>
                  <Button type="button" variant="danger" onClick={() => removeCoupon(c._id)}>
                    <FaTrash />
                    <span>Delete</span>
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
