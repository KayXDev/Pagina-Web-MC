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
} from 'react-icons/fa';
import { Card, Badge } from '@/components/ui';
import { toast } from 'react-toastify';
import { getClientLangFromCookie, type Lang, t } from '@/lib/i18n';

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
  const [lang, setLang] = useState<Lang>('es');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLang(getClientLangFromCookie());
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard', { cache: 'no-store' });
      if (!response.ok) throw new Error(t(lang, 'admin.dashboard.loadError'));
      const data = await response.json();
      setData(data);
    } catch (error) {
      toast.error(t(lang, 'admin.dashboard.loadError'));
    } finally {
      setLoading(false);
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
    },
    {
      title: t(lang, 'admin.dashboard.activeProducts'),
      value: data.stats.activeProducts,
      icon: <FaShoppingCart className="text-4xl text-minecraft-gold" />,
    },
    {
      title: t(lang, 'admin.dashboard.openTickets'),
      value: data.stats.ticketsOpen,
      icon: <FaTicketAlt className="text-4xl text-minecraft-redstone" />,
    },
    {
      title: t(lang, 'admin.dashboard.publishedPosts'),
      value: data.stats.postsPublished,
      icon: <FaNewspaper className="text-4xl text-minecraft-diamond" />,
    },
  ];

  const secondaryStats = [
    {
      title: t(lang, 'admin.dashboard.bannedUsers'),
      value: data.stats.bannedUsers,
      icon: <FaShieldAlt className="text-3xl text-minecraft-redstone" />,
    },
    {
      title: t(lang, 'admin.dashboard.ticketsInProgress'),
      value: data.stats.ticketsInProgress,
      icon: <FaTicketAlt className="text-3xl text-minecraft-gold" />,
    },
    {
      title: t(lang, 'admin.dashboard.applicationsNew'),
      value: data.stats.applicationsNew,
      icon: <FaClipboardList className="text-3xl text-minecraft-grass" />,
    },
    {
      title: t(lang, 'admin.dashboard.drafts'),
      value: data.stats.postsDrafts,
      icon: <FaNewspaper className="text-3xl text-minecraft-diamond" />,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">{t(lang, 'admin.dashboard.title')}</h1>
        <p className="text-gray-400">{t(lang, 'admin.dashboard.subtitle')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {primaryStats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
                {stat.icon}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {secondaryStats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                {stat.icon}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tickets */}
        <Card>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <FaTicketAlt className="mr-2" />
            {t(lang, 'admin.dashboard.recentTicketsTitle')}
          </h2>
          <div className="space-y-3">
            {data.recentTickets.length === 0 ? (
              <p className="text-gray-400">{t(lang, 'admin.dashboard.emptyRecentTickets')}</p>
            ) : (
              data.recentTickets.map((ticket) => (
                <div key={ticket._id} className="p-3 bg-gray-900/50 rounded-md">
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
        <Card>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <FaClipboardList className="mr-2" />
            {t(lang, 'admin.dashboard.recentApplicationsTitle')}
          </h2>
          <div className="space-y-3">
            {data.recentApplications.length === 0 ? (
              <p className="text-gray-400">{t(lang, 'admin.dashboard.emptyRecentApplications')}</p>
            ) : (
              data.recentApplications.map((app) => (
                <div key={app._id} className="p-3 bg-gray-900/50 rounded-md">
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
        <Card>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <FaUsers className="mr-2" />
            {t(lang, 'admin.dashboard.recentUsersTitle')}
          </h2>
          <div className="space-y-3">
            {data.recentUsers.length === 0 ? (
              <p className="text-gray-400">{t(lang, 'admin.dashboard.emptyRecentUsers')}</p>
            ) : (
              data.recentUsers.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-md">
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
        <Card>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <FaHistory className="mr-2" />
            {t(lang, 'admin.dashboard.recentActivityTitle')}
          </h2>
          <div className="space-y-3">
            {data.recentLogs.length === 0 ? (
              <p className="text-gray-400">{t(lang, 'admin.dashboard.emptyRecentLogs')}</p>
            ) : (
              data.recentLogs.map((log) => (
                <div key={log._id} className="p-3 bg-gray-900/50 rounded-md">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <FaNewspaper className="mr-2" />
            {t(lang, 'admin.dashboard.recentNewsTitle')}
          </h2>
          <div className="space-y-3">
            {data.recentBlogPosts.length === 0 ? (
              <p className="text-gray-400">{t(lang, 'admin.dashboard.emptyRecentBlogPosts')}</p>
            ) : (
              data.recentBlogPosts.map((post) => (
                <div key={post._id} className="p-3 bg-gray-900/50 rounded-md">
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

        <Card>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <FaComments className="mr-2" />
            {t(lang, 'admin.dashboard.recentForumTitle')}
          </h2>
          <div className="space-y-3">
            {data.recentForumPosts.length === 0 ? (
              <p className="text-gray-400">{t(lang, 'admin.dashboard.emptyRecentForumPosts')}</p>
            ) : (
              data.recentForumPosts.map((post) => (
                <div key={post._id} className="p-3 bg-gray-900/50 rounded-md">
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
