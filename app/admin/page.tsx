'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaUsers,
  FaShoppingCart,
  FaTicketAlt,
  FaNewspaper,
  FaClipboardList,
  FaHistory,
  FaComments,
  FaShieldAlt,
  FaCog,
  FaSyncAlt,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { Card, Badge, Button } from '@/components/ui';
import { toast } from 'react-toastify';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTicketSlaState } from '@/lib/ticketSla';

interface DashboardData {
  stats: {
    totalUsers: number;
    totalTickets: number;
    bannedUsers: number;
    staffUsers: number;
    adminUsers: number;
    activeProducts: number;
    totalProducts: number;
    ticketsOpen: number;
    ticketsInProgress: number;
    ticketsClosed: number;
    ticketsSlaBreached: number;
    ticketsAwaitingFirstReply: number;
    postsPublished: number;
    postsDrafts: number;
    forumPosts: number;
    applicationsNew: number;
  };
  recentUsers: any[];
  recentTickets: any[];
  recentApplications: any[];
  recentLogs: any[];
  recentBlogPosts: any[];
  recentForumPosts: any[];
}

const formatDateTime = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
};

const ticketBadgeVariant = (status?: string) => {
  if (status === 'OPEN') return 'success' as const;
  if (status === 'IN_PROGRESS') return 'warning' as const;
  if (status === 'CLOSED') return 'default' as const;
  return 'default' as const;
};

const applicationBadgeVariant = (status?: string) => {
  if (status === 'NEW') return 'info' as const;
  if (status === 'REVIEWED') return 'warning' as const;
  if (status === 'ACCEPTED') return 'success' as const;
  if (status === 'REJECTED') return 'danger' as const;
  return 'default' as const;
};

const postBadgeVariant = (published?: boolean) => {
  return published ? ('success' as const) : ('warning' as const);
};

export default function AdminDashboard() {
  const router = useRouter();
  const lang = useClientLang();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ticketFeedFilter, setTicketFeedFilter] = useState<'ALL' | 'BREACHED' | 'WAITING_RESPONSE'>('ALL');
  const filteredRecentTickets = useMemo(() => {
    const tickets = Array.isArray(data?.recentTickets) ? data.recentTickets : [];
    if (ticketFeedFilter === 'BREACHED') {
      return tickets.filter((ticket) => getTicketSlaState(ticket) === 'BREACHED');
    }
    if (ticketFeedFilter === 'WAITING_RESPONSE') {
      return tickets.filter((ticket) => !ticket.firstStaffReplyAt && ticket.status !== 'CLOSED');
    }
    return tickets;
  }, [data?.recentTickets, ticketFeedFilter]);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/dashboard', { cache: 'no-store' });
      if (!response.ok) throw new Error(t(lang, 'admin.dashboard.loadError'));
      const data = await response.json();
      setData(data);
    } catch (error) {
      toast.error(t(lang, 'admin.dashboard.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="shimmer h-32"></Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const ticketsTotal = (data.stats.ticketsOpen || 0) + (data.stats.ticketsInProgress || 0) + (data.stats.ticketsClosed || 0);
  const postsTotal = (data.stats.postsPublished || 0) + (data.stats.postsDrafts || 0);

  const primaryStats = [
    {
      title: t(lang, 'admin.dashboard.totalUsers'),
      value: data.stats.totalUsers,
      icon: <FaUsers className="text-4xl text-minecraft-grass" />,
      href: '/admin/users',
      accent: 'bg-minecraft-grass/10 text-minecraft-grass',
    },
    {
      title: t(lang, 'admin.dashboard.activeProducts'),
      value: data.stats.activeProducts,
      icon: <FaShoppingCart className="text-4xl text-minecraft-gold" />,
      href: '/admin/products',
      accent: 'bg-minecraft-gold/10 text-minecraft-gold',
    },
    {
      title: t(lang, 'admin.dashboard.openTickets'),
      value: data.stats.ticketsOpen,
      icon: <FaTicketAlt className="text-4xl text-minecraft-redstone" />,
      href: '/admin/tickets',
      accent: 'bg-minecraft-redstone/10 text-minecraft-redstone',
    },
    {
      title: t(lang, 'admin.dashboard.publishedPosts'),
      value: data.stats.postsPublished,
      icon: <FaNewspaper className="text-4xl text-minecraft-diamond" />,
      href: '/admin/blog',
      accent: 'bg-minecraft-diamond/10 text-minecraft-diamond',
    },
  ];

  const secondaryStats = [
    {
      title: t(lang, 'admin.dashboard.bannedUsers'),
      value: data.stats.bannedUsers,
      icon: <FaShieldAlt className="text-3xl text-minecraft-redstone" />,
      href: '/admin/users',
      accent: 'bg-minecraft-redstone/10 text-minecraft-redstone',
    },
    {
      title: t(lang, 'admin.dashboard.ticketsInProgress'),
      value: data.stats.ticketsInProgress,
      icon: <FaTicketAlt className="text-3xl text-minecraft-gold" />,
      href: '/admin/tickets',
      accent: 'bg-minecraft-gold/10 text-minecraft-gold',
    },
    {
      title: t(lang, 'admin.dashboard.applicationsNew'),
      value: data.stats.applicationsNew,
      icon: <FaClipboardList className="text-3xl text-minecraft-grass" />,
      href: '/admin/postulaciones',
      accent: 'bg-minecraft-grass/10 text-minecraft-grass',
    },
    {
      title: t(lang, 'admin.dashboard.drafts'),
      value: data.stats.postsDrafts,
      icon: <FaNewspaper className="text-3xl text-minecraft-diamond" />,
      href: '/admin/blog',
      accent: 'bg-minecraft-diamond/10 text-minecraft-diamond',
    },
    {
      title: lang === 'es' ? 'SLA vencidos' : 'SLA breached',
      value: data.stats.ticketsSlaBreached,
      icon: <FaExclamationTriangle className="text-3xl text-minecraft-redstone" />,
      href: '/admin/tickets',
      accent: 'bg-minecraft-redstone/10 text-minecraft-redstone',
    },
  ];

  const StatCard = ({
    title,
    value,
    icon,
    href,
    accent,
  }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    href: string;
    accent: string;
  }) => {
    return (
      <Link href={href} className="block group">
        <Card className="relative overflow-hidden rounded-[28px] p-6">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-white/10" />
          <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-slate-200/45 blur-3xl dark:bg-white/5" />

          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-1 text-sm text-slate-500 dark:text-slate-400 truncate">{title}</p>
              <p className="text-3xl font-bold leading-none tracking-[-0.04em] text-slate-950 dark:text-white">{value}</p>
            </div>
            <div className={`grid h-12 w-12 place-items-center rounded-2xl ${accent}`}>{icon}</div>
          </div>
          <div className="mt-4 h-px bg-slate-200/80 dark:bg-white/10" />
          <div className="mt-3 text-sm font-medium text-slate-500 transition-colors group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-200">
            {t(lang, 'notifications.viewAll')}
          </div>
        </Card>
      </Link>
    );
  };

  const MiniStat = ({
    title,
    value,
    icon,
    href,
    accent,
  }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    href: string;
    accent: string;
  }) => {
    return (
      <Link href={href} className="block group">
        <div className="rounded-[24px] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 truncate">{title}</div>
              <div className="text-lg font-bold leading-none text-slate-950 dark:text-white">{value}</div>
            </div>
            <div className={`grid h-10 w-10 place-items-center rounded-2xl ${accent}`}>{icon}</div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Operational overview
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-950 dark:text-white md:text-3xl">
            {t(lang, 'admin.dashboard.title')}
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">{t(lang, 'admin.dashboard.subtitle')}</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="h-10"
          >
            <FaSyncAlt />
            <span>{refreshing ? t(lang, 'admin.dashboard.refreshing') : t(lang, 'admin.dashboard.refresh')}</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push('/admin/settings')}
            className="h-10"
          >
            <FaCog />
            <span>{t(lang, 'admin.dashboard.siteSettings')}</span>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {primaryStats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <StatCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              href={stat.href}
              accent={stat.accent}
            />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hover={false} className="rounded-[28px] lg:col-span-1">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold tracking-[-0.03em] text-slate-950 dark:text-white">{t(lang, 'admin.dashboard.quickActions')}</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">{t(lang, 'admin.dashboard.quickActionsHint')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => router.push('/admin/users')} className="justify-start">
              <FaUsers />
              <span>{t(lang, 'admin.dashboard.goUsers')}</span>
            </Button>
            <Button variant="secondary" onClick={() => router.push('/admin/tickets')} className="justify-start">
              <FaTicketAlt />
              <span>{t(lang, 'admin.dashboard.goTickets')}</span>
            </Button>
            <Button variant="secondary" onClick={() => router.push('/admin/blog')} className="justify-start">
              <FaNewspaper />
              <span>{t(lang, 'admin.dashboard.goBlog')}</span>
            </Button>
            <Button variant="secondary" onClick={() => router.push('/admin/logs')} className="justify-start">
              <FaHistory />
              <span>{t(lang, 'admin.dashboard.goLogs')}</span>
            </Button>
          </div>

          <div className="mt-6">
            <div className="h-px bg-gray-200 dark:bg-white/10 mb-4" />

            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t(lang, 'admin.menu.tickets')}</div>
              <div className="rounded-xl border border-gray-200 bg-white/70 p-3 dark:border-white/10 dark:bg-black/20">
                <div className="flex items-center justify-between gap-3 text-xs mb-2">
                  <span className="text-gray-600 dark:text-gray-400">{t(lang, 'admin.dashboard.recentTicketsTitle')}</span>
                  <span className="text-gray-700 dark:text-gray-300">{ticketsTotal}</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden dark:bg-white/10">
                  <div className="h-full flex">
                    <div
                      className="h-full bg-minecraft-grass"
                      style={{ width: ticketsTotal ? `${(data.stats.ticketsOpen / ticketsTotal) * 100}%` : '0%' }}
                    />
                    <div
                      className="h-full bg-minecraft-gold"
                      style={{ width: ticketsTotal ? `${(data.stats.ticketsInProgress / ticketsTotal) * 100}%` : '0%' }}
                    />
                    <div
                      className="h-full bg-gray-400 dark:bg-gray-500"
                      style={{ width: ticketsTotal ? `${(data.stats.ticketsClosed / ticketsTotal) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                  <span className="text-gray-600 dark:text-gray-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-minecraft-grass mr-1" />
                    {t(lang, 'support.status.open')}: {data.stats.ticketsOpen}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-minecraft-gold mr-1" />
                    {t(lang, 'support.status.inProgress')}: {data.stats.ticketsInProgress}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-gray-400 mr-1" />
                    {t(lang, 'support.status.closed')}: {data.stats.ticketsClosed}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-minecraft-redstone mr-1" />
                    {lang === 'es' ? 'SLA vencidos' : 'SLA breached'}: {data.stats.ticketsSlaBreached}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t(lang, 'admin.menu.blog')}</div>
              <div className="rounded-xl border border-gray-200 bg-white/70 p-3 dark:border-white/10 dark:bg-black/20">
                <div className="flex items-center justify-between gap-3 text-xs mb-2">
                  <span className="text-gray-600 dark:text-gray-400">{t(lang, 'admin.dashboard.recentNewsTitle')}</span>
                  <span className="text-gray-700 dark:text-gray-300">{postsTotal}</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden dark:bg-white/10">
                  <div className="h-full flex">
                    <div
                      className="h-full bg-minecraft-diamond"
                      style={{ width: postsTotal ? `${(data.stats.postsPublished / postsTotal) * 100}%` : '0%' }}
                    />
                    <div
                      className="h-full bg-minecraft-gold"
                      style={{ width: postsTotal ? `${(data.stats.postsDrafts / postsTotal) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                  <span className="text-gray-600 dark:text-gray-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-minecraft-diamond mr-1" />
                    {t(lang, 'admin.dashboard.statusPublished')}: {data.stats.postsPublished}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-minecraft-gold mr-1" />
                    {t(lang, 'admin.dashboard.statusDraft')}: {data.stats.postsDrafts}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {secondaryStats.map((stat) => (
                <MiniStat
                  key={stat.title}
                  title={stat.title}
                  value={stat.value}
                  icon={stat.icon}
                  href={stat.href}
                  accent={stat.accent}
                />
              ))}
            </div>
          </div>
        </Card>

        <Card hover={false} className="rounded-[28px] lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t(lang, 'admin.dashboard.recentActivityTitle')}</h2>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => router.push('/admin/tickets')} className="h-9 px-3 text-sm">
                <FaTicketAlt />
                <span>{t(lang, 'admin.menu.tickets')}</span>
              </Button>
              <Button variant="secondary" onClick={() => router.push('/admin/logs')} className="h-9 px-3 text-sm">
                <FaHistory />
                <span>{t(lang, 'admin.menu.logs')}</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaTicketAlt />
                  <span>{t(lang, 'admin.dashboard.recentTicketsTitle')}</span>
                </div>
                <div className="flex gap-2">
                  {[
                    { id: 'ALL', label: lang === 'es' ? 'Todos' : 'All' },
                    { id: 'BREACHED', label: lang === 'es' ? 'SLA' : 'SLA' },
                    { id: 'WAITING_RESPONSE', label: lang === 'es' ? 'Sin respuesta' : 'Waiting' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setTicketFeedFilter(filter.id as 'ALL' | 'BREACHED' | 'WAITING_RESPONSE')}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] transition-colors ${
                        ticketFeedFilter === filter.id
                          ? 'border-minecraft-grass/40 bg-minecraft-grass/10 text-gray-900 dark:text-white'
                          : 'border-gray-200 bg-white text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {filteredRecentTickets.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400">{t(lang, 'admin.dashboard.emptyRecentTickets')}</p>
                ) : (
                  filteredRecentTickets.slice(0, 4).map((ticket) => (
                    <div
                      key={ticket._id}
                      className="p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between mb-2 gap-3">
                        <p className="text-gray-900 dark:text-white font-medium truncate">{ticket.subject}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant={ticketBadgeVariant(ticket.status)}>{ticket.status}</Badge>
                          <Badge variant={getTicketSlaState(ticket) === 'BREACHED' ? 'danger' : 'info'}>
                            {getTicketSlaState(ticket) === 'BREACHED'
                              ? (lang === 'es' ? 'SLA vencido' : 'SLA breached')
                              : (lang === 'es' ? 'En SLA' : 'On SLA')}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <p className="text-gray-600 dark:text-gray-400 truncate">
                          {ticket.username}
                          {ticket.assignedStaffName ? ` • ${ticket.assignedStaffName}` : ''}
                        </p>
                        <p className="text-gray-500 dark:text-gray-500">{formatDateTime(ticket.updatedAt || ticket.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <FaHistory />
                <span>{t(lang, 'admin.dashboard.recentActivityTitle')}</span>
              </div>
              <div className="space-y-3">
                {data.recentLogs.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400">{t(lang, 'admin.dashboard.emptyRecentLogs')}</p>
                ) : (
                  data.recentLogs.slice(0, 4).map((log) => (
                    <div
                      key={log._id}
                      className="p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between mb-1 gap-3">
                        <p className="text-gray-900 dark:text-white font-medium truncate">{log.action}</p>
                        <p className="text-gray-500 text-sm">{formatDateTime(log.createdAt)}</p>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm truncate">
                        {log.adminUsername}
                        {log.targetType ? ` • ${log.targetType}` : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card hover={false} className="rounded-2xl dark:border-white/10 dark:bg-gray-950/25">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t(lang, 'admin.dashboard.recentNewsTitle')}</h2>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => router.push('/admin/blog')} className="h-9 px-3 text-sm">
              <FaNewspaper />
              <span>{t(lang, 'admin.menu.blog')}</span>
            </Button>
            <Button variant="secondary" onClick={() => router.push('/admin/foro')} className="h-9 px-3 text-sm">
              <FaComments />
              <span>{t(lang, 'admin.menu.forum')}</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <FaNewspaper />
              <span>{t(lang, 'admin.dashboard.recentNewsTitle')}</span>
            </div>
            <div className="space-y-3">
              {data.recentBlogPosts.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">{t(lang, 'admin.dashboard.emptyRecentBlogPosts')}</p>
              ) : (
                data.recentBlogPosts.slice(0, 4).map((post) => (
                  <div
                    key={post._id}
                    className="p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <p className="text-gray-900 dark:text-white font-medium truncate">{post.title}</p>
                      <Badge variant={postBadgeVariant(Boolean(post.isPublished))}>
                        {post.isPublished ? t(lang, 'admin.dashboard.statusPublished') : t(lang, 'admin.dashboard.statusDraft')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <p className="text-gray-600 dark:text-gray-400 truncate">{post.author}</p>
                      <p className="text-gray-500">{formatDateTime(post.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <FaComments />
              <span>{t(lang, 'admin.dashboard.recentForumTitle')}</span>
            </div>
            <div className="space-y-3">
              {data.recentForumPosts.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">{t(lang, 'admin.dashboard.emptyRecentForumPosts')}</p>
              ) : (
                data.recentForumPosts.slice(0, 4).map((post) => (
                  <div
                    key={post._id}
                    className="p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <p className="text-gray-900 dark:text-white font-medium truncate">{post.title}</p>
                      <Badge variant="default">{post.category}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <p className="text-gray-600 dark:text-gray-400 truncate">{post.authorUsername}</p>
                      <p className="text-gray-500">{formatDateTime(post.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
