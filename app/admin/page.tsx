'use client';

import { useEffect, useState } from 'react';
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
} from 'react-icons/fa';
import { Card, Badge, Button } from '@/components/ui';
import { toast } from 'react-toastify';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const [lang, setLang] = useState<Lang>('es');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setLang(getClientLangFromCookie());
    fetchDashboardData();
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
        <Card className="p-6 rounded-2xl border-white/10 bg-gray-950/35 hover:bg-gray-950/45">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-gray-400 text-sm mb-1 truncate">{title}</p>
              <p className="text-3xl font-bold text-white leading-none">{value}</p>
            </div>
            <div className={`h-12 w-12 rounded-xl grid place-items-center ${accent}`}>{icon}</div>
          </div>
          <div className="mt-4 h-px bg-white/10" />
          <div className="mt-3 text-sm text-gray-400 group-hover:text-gray-200 transition-colors">
            {t(lang, 'notifications.viewAll')}
          </div>
        </Card>
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
            {t(lang, 'admin.dashboard.title')}
          </h1>
          <p className="text-gray-400 mt-1">{t(lang, 'admin.dashboard.subtitle')}</p>
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

      <Card hover={false} className="p-6 rounded-2xl border-white/10 bg-gray-950/30">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-white">{t(lang, 'admin.dashboard.quickActions')}</h2>
          <span className="text-xs text-gray-400">{t(lang, 'admin.dashboard.quickActionsHint')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
      </Card>

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

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {secondaryStats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link href={stat.href} className="block group">
              <Card className="p-5 rounded-2xl border-white/10 bg-gray-950/20 hover:bg-gray-950/30">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-gray-400 text-sm mb-1 truncate">{stat.title}</p>
                    <p className="text-2xl font-bold text-white leading-none">{stat.value}</p>
                  </div>
                  <div className={`h-11 w-11 rounded-xl grid place-items-center ${stat.accent}`}>{stat.icon}</div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tickets */}
        <Card className="border-white/10 bg-gray-950/25 rounded-2xl">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaTicketAlt />
              <span>{t(lang, 'admin.dashboard.recentTicketsTitle')}</span>
            </h2>
            <Button variant="secondary" onClick={() => router.push('/admin/tickets')} className="h-9 px-3 text-sm">
              <FaTicketAlt />
              <span>{t(lang, 'admin.menu.tickets')}</span>
            </Button>
          </div>
          <div className="space-y-3">
            {data.recentTickets.length === 0 ? (
              <p className="text-gray-400">{t(lang, 'admin.dashboard.emptyRecentTickets')}</p>
            ) : (
              data.recentTickets.map((ticket) => (
                <div
                  key={ticket._id}
                  className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <p className="text-white font-medium truncate">{ticket.subject}</p>
                    <Badge variant={ticketBadgeVariant(ticket.status)}>{ticket.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-gray-400 truncate">{ticket.username}</p>
                    <p className="text-gray-500">{formatDateTime(ticket.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Applications */}
        <Card className="border-white/10 bg-gray-950/25 rounded-2xl">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaClipboardList />
              <span>{t(lang, 'admin.dashboard.recentApplicationsTitle')}</span>
            </h2>
            <Button variant="secondary" onClick={() => router.push('/admin/postulaciones')} className="h-9 px-3 text-sm">
              <FaClipboardList />
              <span>{t(lang, 'admin.menu.applications')}</span>
            </Button>
          </div>
          <div className="space-y-3">
            {data.recentApplications.length === 0 ? (
              <p className="text-gray-400">{t(lang, 'admin.dashboard.emptyRecentApplications')}</p>
            ) : (
              data.recentApplications.map((app) => (
                <div
                  key={app._id}
                  className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <p className="text-white font-medium truncate">{app.username}</p>
                    <Badge variant={applicationBadgeVariant(app.status)}>{app.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-gray-400 truncate">{app.discord}</p>
                    <p className="text-gray-500">{formatDateTime(app.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Users */}
        <Card className="border-white/10 bg-gray-950/25 rounded-2xl">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaUsers />
              <span>{t(lang, 'admin.dashboard.recentUsersTitle')}</span>
            </h2>
            <Button variant="secondary" onClick={() => router.push('/admin/users')} className="h-9 px-3 text-sm">
              <FaUsers />
              <span>{t(lang, 'admin.menu.users')}</span>
            </Button>
          </div>
          <div className="space-y-3">
            {data.recentUsers.length === 0 ? (
              <p className="text-gray-400">{t(lang, 'admin.dashboard.emptyRecentUsers')}</p>
            ) : (
              data.recentUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{user.username}</p>
                    <p className="text-gray-400 text-sm truncate">{user.email}</p>
                  </div>
                  <Badge variant={user.role === 'OWNER' ? 'danger' : user.role === 'ADMIN' ? 'warning' : 'default'}>
                    {user.role}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Admin Logs */}
        <Card className="border-white/10 bg-gray-950/25 rounded-2xl">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaHistory />
              <span>{t(lang, 'admin.dashboard.recentActivityTitle')}</span>
            </h2>
            <Button variant="secondary" onClick={() => router.push('/admin/logs')} className="h-9 px-3 text-sm">
              <FaHistory />
              <span>{t(lang, 'admin.menu.logs')}</span>
            </Button>
          </div>
          <div className="space-y-3">
            {data.recentLogs.length === 0 ? (
              <p className="text-gray-400">{t(lang, 'admin.dashboard.emptyRecentLogs')}</p>
            ) : (
              data.recentLogs.map((log) => (
                <div
                  key={log._id}
                  className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1 gap-3">
                    <p className="text-white font-medium truncate">{log.action}</p>
                    <p className="text-gray-500 text-sm">{formatDateTime(log.createdAt)}</p>
                  </div>
                  <p className="text-gray-400 text-sm truncate">
                    {log.adminUsername}
                    {log.targetType ? ` • ${log.targetType}` : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Content Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-white/10 bg-gray-950/25 rounded-2xl">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaNewspaper />
              <span>{t(lang, 'admin.dashboard.recentNewsTitle')}</span>
            </h2>
            <Button variant="secondary" onClick={() => router.push('/admin/blog')} className="h-9 px-3 text-sm">
              <FaNewspaper />
              <span>{t(lang, 'admin.menu.blog')}</span>
            </Button>
          </div>
          <div className="space-y-3">
            {data.recentBlogPosts.length === 0 ? (
              <p className="text-gray-400">{t(lang, 'admin.dashboard.emptyRecentBlogPosts')}</p>
            ) : (
              data.recentBlogPosts.map((post) => (
                <div
                  key={post._id}
                  className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <p className="text-white font-medium truncate">{post.title}</p>
                    <Badge variant={postBadgeVariant(Boolean(post.isPublished))}>
                      {post.isPublished ? t(lang, 'admin.dashboard.statusPublished') : t(lang, 'admin.dashboard.statusDraft')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-gray-400 truncate">{post.author}</p>
                    <p className="text-gray-500">{formatDateTime(post.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="border-white/10 bg-gray-950/25 rounded-2xl">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaComments />
              <span>{t(lang, 'admin.dashboard.recentForumTitle')}</span>
            </h2>
            <Button variant="secondary" onClick={() => router.push('/admin/foro')} className="h-9 px-3 text-sm">
              <FaComments />
              <span>{t(lang, 'admin.menu.forum')}</span>
            </Button>
          </div>
          <div className="space-y-3">
            {data.recentForumPosts.length === 0 ? (
              <p className="text-gray-400">{t(lang, 'admin.dashboard.emptyRecentForumPosts')}</p>
            ) : (
              data.recentForumPosts.map((post) => (
                <div
                  key={post._id}
                  className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <p className="text-white font-medium truncate">{post.title}</p>
                    <Badge variant="default">{post.category}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-gray-400 truncate">{post.authorUsername}</p>
                    <p className="text-gray-500">{formatDateTime(post.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
