'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FaBell } from 'react-icons/fa';
import PageHeader from '@/components/PageHeader';
import { Badge, Button, Card } from '@/components/ui';
import { toast } from 'react-toastify';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';
import { formatTimeAgo } from '@/lib/utils';

type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  href?: string;
  type: NotificationType;
  createdAt: string;
};

export default function NotificacionesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const lang = useClientLang();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/notificaciones');
    }
  }, [status, router]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || t(lang, 'notifications.loadError'));

      setItems(Array.isArray((data as any).items) ? ((data as any).items as NotificationItem[]) : []);
      setUnreadCount(typeof (data as any).unreadCount === 'number' ? (data as any).unreadCount : 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(lang, 'notifications.loadError'));
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, lang]);

  const unreadIds = useMemo(() => items.map((n) => n._id), [items]);

  const typeToBadgeVariant = (type: NotificationType) => {
    switch (type) {
      case 'SUCCESS':
        return 'success' as const;
      case 'WARNING':
        return 'warning' as const;
      case 'ERROR':
        return 'danger' as const;
      default:
        return 'info' as const;
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      setItems([]);
      setUnreadCount(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setMarkingAll(false);
    }
  };

  const markOneRead = async (id: string) => {
    setMarkingId(id);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      setItems((prev) => prev.filter((n) => n._id !== id));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setMarkingId(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen py-20 px-4 flex items-center justify-center">
        <div className="text-white text-xl">{t(lang, 'common.loading')}</div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !session) {
    return null;
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={t(lang, 'notifications.title')}
          description={t(lang, 'notifications.subtitle')}
          icon={<FaBell className="text-5xl text-minecraft-diamond" />}
        />

        <Card hover={false} className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-gray-300">
              {t(lang, 'notifications.unreadCount')}: <span className="font-semibold text-white">{unreadCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={fetchNotifications} disabled={loading}>
                {t(lang, 'notifications.refresh')}
              </Button>
              <Button variant="primary" onClick={markAllRead} disabled={markingAll || unreadIds.length === 0}>
                {t(lang, 'notifications.markAllRead')}
              </Button>
            </div>
          </div>
        </Card>

        {loading ? (
          <Card hover={false} className="text-center text-gray-400 py-10">
            {t(lang, 'common.loading')}
          </Card>
        ) : items.length === 0 ? (
          <Card hover={false} className="text-center text-gray-400 py-10">
            {t(lang, 'notifications.empty')}
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((n) => {
              return (
                <Card key={n._id} hover={false} className="border-gray-800">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white truncate">{n.title}</h3>
                        <Badge variant={typeToBadgeVariant(n.type)}>{n.type}</Badge>
                      </div>
                      <div className="text-sm text-gray-400 mb-3">
                        {formatTimeAgo(n.createdAt, lang === 'es' ? 'es-ES' : 'en-US')} •{' '}
                        {new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(n.createdAt))}
                      </div>
                      <div className="whitespace-pre-wrap text-gray-200">{n.message}</div>
                      {n.href && (
                        <div className="mt-3">
                          <Link href={n.href} className="text-minecraft-grass hover:text-minecraft-grass/80 font-medium">
                            {t(lang, 'notifications.goToLink')}
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={markingId === n._id}
                        onClick={() => markOneRead(n._id)}
                      >
                        {t(lang, 'notifications.markRead')}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
