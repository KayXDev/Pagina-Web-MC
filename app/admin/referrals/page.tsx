'use client';

import { useEffect, useState } from 'react';
import { FaUserFriends, FaPlus } from 'react-icons/fa';
import { Card, Button, Input, Badge } from '@/components/ui';
import { toast } from 'react-toastify';

type ReferralProfile = {
  _id: string;
  userId: string;
  code: string;
  active: boolean;
  invitesCount: number;
  successfulInvites: number;
  totalRewardsGiven: number;
  user?: {
    id: string;
    username: string;
    email: string;
    balance: number;
  } | null;
};

export default function AdminReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [profiles, setProfiles] = useState<ReferralProfile[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [referralDiscountPercent, setReferralDiscountPercent] = useState('5');
  const [referralWebhook, setReferralWebhook] = useState('');

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/referrals', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');
      const list = Array.isArray((data as any)?.profiles) ? (data as any).profiles : [];
      setProfiles(list as ReferralProfile[]);
      setReferralDiscountPercent(String((data as any)?.referralDiscountPercent ?? 5));
      setReferralWebhook(String((data as any)?.referralWebhook || (data as any)?.shop_referral_discord_webhook || ''));
    } catch (err: any) {
      toast.error(err?.message || 'Error loading referrals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const createForUser = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery: userQuery.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');
      toast.success('Referral profile ready');
      setUserQuery('');
      fetchProfiles();
    } catch (err: any) {
      toast.error(err?.message || 'Error creating referral');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (profile: ReferralProfile) => {
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: profile._id, active: !profile.active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');
      fetchProfiles();
    } catch (err: any) {
      toast.error(err?.message || 'Error updating referral');
    }
  };

  const saveReferralDiscount = async () => {
    setSavingDiscount(true);
    try {
      const value = Math.max(0, Math.min(100, Number(referralDiscountPercent || 0)));
      const res = await fetch('/api/admin/referrals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralDiscountPercent: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');
      setReferralDiscountPercent(String((data as any)?.referralDiscountPercent ?? value));
      toast.success('Referral discount updated');
    } catch (err: any) {
      toast.error(err?.message || 'Error updating referral discount');
    } finally {
      setSavingDiscount(false);
    }
  };

  const saveReferralWebhook = async () => {
    setSavingWebhook(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_referral_discord_webhook: referralWebhook.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');
      setReferralWebhook(String(referralWebhook || '').trim());
      toast.success('Referral webhook saved');
    } catch (err: any) {
      toast.error(err?.message || 'Error saving referral webhook');
    } finally {
      setSavingWebhook(false);
    }
  };

  const testReferralWebhook = async () => {
    setTestingWebhook(true);
    try {
      const res = await fetch('/api/admin/referrals/webhook-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');
      toast.success('Referral test webhook sent');
    } catch (err: any) {
      toast.error(err?.message || 'Error sending referral test webhook');
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-11 w-11 rounded-xl bg-gray-100 border border-gray-200 grid place-items-center text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-white">
            <FaUserFriends />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Referrals</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Manage personal invite codes and rewards.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <Input placeholder="User ID / email / username" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} />
          <Button type="button" onClick={createForUser} disabled={creating || !userQuery.trim()}>
            <FaPlus />
            <span>{creating ? 'Creating...' : 'Create/Ensure profile'}</span>
          </Button>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 dark:border-white/10 p-3">
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Referral discount percentage</div>
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              type="number"
              min="0"
              max="100"
              value={referralDiscountPercent}
              onChange={(e) => setReferralDiscountPercent(e.target.value)}
              placeholder="5"
            />
            <Button type="button" onClick={saveReferralDiscount} disabled={savingDiscount}>
              <span>{savingDiscount ? 'Saving...' : 'Save %'}</span>
            </Button>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            This discount is applied automatically to users who signed up with a valid referral code.
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 dark:border-white/10 p-3">
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Referral reward webhook (Discord)</div>
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              type="text"
              value={referralWebhook}
              onChange={(e) => setReferralWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
            />
            <Button type="button" variant="secondary" onClick={testReferralWebhook} disabled={testingWebhook || !referralWebhook.trim()}>
              <span>{testingWebhook ? 'Sending test...' : 'Send test'}</span>
            </Button>
            <Button type="button" onClick={saveReferralWebhook} disabled={savingWebhook}>
              <span>{savingWebhook ? 'Saving...' : 'Save webhook'}</span>
            </Button>
          </div>
        </div>
      </Card>

      <Card hover={false} className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25">
        {loading ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">Loading...</div>
        ) : profiles.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">No referrals yet.</div>
        ) : (
          <div className="space-y-2">
            {profiles.map((p) => (
              <div key={p._id} className="rounded-xl border border-gray-200 dark:border-white/10 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-gray-900 dark:text-white">{p.code}</div>
                    <Badge variant={p.active ? 'success' : 'default'}>{p.active ? 'ACTIVE' : 'OFF'}</Badge>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {p.user?.username || p.user?.email || p.userId} | Invites: {p.successfulInvites} | Rewards: {Number(p.totalRewardsGiven || 0).toFixed(2)}
                  </div>
                </div>

                <Button type="button" variant="secondary" onClick={() => toggleActive(p)}>
                  <span>{p.active ? 'Disable' : 'Enable'}</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
