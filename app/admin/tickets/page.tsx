'use client';

import { useEffect, useRef, useState } from 'react';
import { FaTicketAlt, FaTimes, FaSearch, FaSyncAlt } from 'react-icons/fa';
import { Card, Badge, Button, Select, Textarea, Input } from '@/components/ui';
import { toast } from 'react-toastify';
import { formatDateTime } from '@/lib/utils';
import { t, type Lang } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

interface Ticket {
  _id: string;
  username: string;
  email: string;
  subject: string;
  category: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketReply {
  _id: string;
  ticketId: string;
  userId: string;
  username: string;
  message: string;
  isStaff: boolean;
  isAi?: boolean;
  createdAt: string;
}

type Participant = {
  userId: string;
  username: string;
  isStaff: boolean;
  lastSeen: string;
};

export default function AdminTicketsPage() {
  const lang = useClientLang();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketDetailsLoading, setTicketDetailsLoading] = useState(false);
  const [ticketReplies, setTicketReplies] = useState<TicketReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [activeStatus, setActiveStatus] = useState<'IN_PROGRESS' | 'OPEN' | 'CLOSED'>('IN_PROGRESS');
  const [searchTerm, setSearchTerm] = useState('');

  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const liveFetchRef = useRef(false);

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTickets = async (langOverride?: Lang, opts?: { silent?: boolean }) => {
    const useLang = langOverride || lang;
    if (!opts?.silent) setLoading(true);
    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/tickets');
      if (!response.ok) throw new Error(t(useLang, 'admin.tickets.loadError'));
      const data = await response.json();
      setTickets(data);

      // Pick a sane default tab based on what exists.
      const list = Array.isArray(data) ? (data as Ticket[]) : [];
      const hasInProgress = list.some((t) => t.status === 'IN_PROGRESS');
      const hasOpen = list.some((t) => t.status === 'OPEN');
      const hasClosed = list.some((t) => t.status === 'CLOSED');
      setActiveStatus(hasInProgress ? 'IN_PROGRESS' : hasOpen ? 'OPEN' : hasClosed ? 'CLOSED' : 'OPEN');
    } catch (error) {
      toast.error(t(useLang, 'admin.tickets.loadError'));
    } finally {
      if (!opts?.silent) setLoading(false);
      setRefreshing(false);
    }
  };

  const updateTicket = async (ticketId: string, updates: any) => {
    try {
      const response = await fetch('/api/admin/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, updates }),
      });

      if (!response.ok) throw new Error(t(lang, 'admin.tickets.updateError'));

      toast.success(t(lang, 'admin.tickets.updateSuccess'));
      fetchTickets(undefined, { silent: true });
      if (selectedTicket?._id === ticketId) {
        setSelectedTicket({ ...selectedTicket, ...updates });
      }
    } catch (error) {
      toast.error(t(lang, 'admin.tickets.updateError'));
    }
  };

  const fetchTicketDetails = async (ticketId: string, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setTicketDetailsLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t(lang, 'admin.tickets.loadConversationError'));
      }
      setTicketReplies(data.replies || []);
    } catch (error: any) {
      toast.error(error.message || t(lang, 'admin.tickets.loadConversationError'));
      setTicketReplies([]);
    } finally {
      if (!opts?.silent) setTicketDetailsLoading(false);
    }
  };

  const fetchParticipants = async (ticketId: string) => {
    setParticipantsLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/presence`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || 'Error');

      setParticipants(Array.isArray((data as any).participants) ? ((data as any).participants as Participant[]) : []);
    } catch {
      setParticipants([]);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const heartbeat = async (ticketId: string) => {
    try {
      await fetch(`/api/tickets/${ticketId}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (selectedTicket?._id) {
      fetchTicketDetails(selectedTicket._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicket?._id]);

  useEffect(() => {
    const ticketId = selectedTicket?._id;
    if (!ticketId) return;

    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await Promise.all([heartbeat(ticketId), fetchParticipants(ticketId)]);
    };

    run();

    const presenceInterval = setInterval(() => {
      heartbeat(ticketId);
      fetchParticipants(ticketId);
    }, 10_000);

    const detailsInterval = setInterval(() => {
      if (liveFetchRef.current) return;
      liveFetchRef.current = true;
      fetchTicketDetails(ticketId, { silent: true })
        .catch(() => undefined)
        .finally(() => {
          liveFetchRef.current = false;
        });
    }, 4_000);

    return () => {
      cancelled = true;
      clearInterval(presenceInterval);
      clearInterval(detailsInterval);
      fetch(`/api/tickets/${ticketId}/presence`, { method: 'DELETE' }).catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicket?._id]);

  const handleSendReply = async () => {
    if (!selectedTicket?._id) return;
    if (!replyText.trim()) return;

    try {
      const response = await fetch(`/api/tickets/${selectedTicket._id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t(lang, 'admin.tickets.replyError'));
      }
      setReplyText('');
      await fetchTicketDetails(selectedTicket._id);
      await fetchTickets(undefined, { silent: true });
    } catch (error: any) {
      toast.error(error.message || t(lang, 'admin.tickets.replyError'));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="success">{t(lang, 'admin.tickets.status.open')}</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="warning">{t(lang, 'admin.tickets.status.inProgress')}</Badge>;
      case 'CLOSED':
        return <Badge variant="default">{t(lang, 'admin.tickets.status.closed')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <Badge variant="danger">{t(lang, 'admin.tickets.priority.high')}</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">{t(lang, 'admin.tickets.priority.medium')}</Badge>;
      case 'LOW':
        return <Badge variant="default">{t(lang, 'admin.tickets.priority.low')}</Badge>;
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  const inProgressTickets = tickets.filter((t) => t.status === 'IN_PROGRESS');
  const openTickets = tickets.filter((t) => t.status === 'OPEN');
  const closedTickets = tickets.filter((t) => t.status === 'CLOSED');

  const statusTickets =
    activeStatus === 'IN_PROGRESS'
      ? inProgressTickets
      : activeStatus === 'OPEN'
        ? openTickets
        : closedTickets;

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTickets = normalizedSearch
    ? statusTickets.filter((ticket) => {
        const blob = [
          ticket.subject,
          ticket.username,
          ticket.email,
          ticket.category,
          ticket.message,
          ticket.status,
          ticket.priority,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return blob.includes(normalizedSearch);
      })
    : statusTickets;

  const emptyText =
    activeStatus === 'IN_PROGRESS'
      ? t(lang, 'admin.tickets.emptyInProgress')
      : activeStatus === 'OPEN'
        ? t(lang, 'admin.tickets.emptyOpen')
        : t(lang, 'admin.tickets.emptyClosed');

  const openDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setReplyText('');
    setAiError(null);
    setAiResult(null);
  };

  const TabButton = ({
    status,
    label,
    count,
  }: {
    status: 'IN_PROGRESS' | 'OPEN' | 'CLOSED';
    label: string;
    count: number;
  }) => {
    const active = activeStatus === status;
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => setActiveStatus(status)}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-minecraft-grass/40 ${
          active
            ? 'bg-gray-100 border-gray-200 text-gray-900 dark:bg-white/10 dark:border-white/10 dark:text-white'
            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-white/5 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10'
        }`}
      >
        <span className="font-medium">{label}</span>
        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-50 border border-gray-200 text-gray-700 dark:bg-black/20 dark:border-white/10 dark:text-gray-200">
          {count}
        </span>
      </button>
    );
  };

  const closeDetails = () => {
    if (selectedTicket?._id) {
      fetch(`/api/tickets/${selectedTicket._id}/presence`, { method: 'DELETE' }).catch(() => undefined);
    }
    setSelectedTicket(null);
    setTicketReplies([]);
    setReplyText('');
    setParticipants([]);
    setAiError(null);
    setAiResult(null);
  };

  const fetchAiSuggestion = async () => {
    if (!selectedTicket?._id) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/admin/tickets/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: selectedTicket._id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const hint = (data as any)?.hint ? ` ${(data as any).hint}` : '';
        throw new Error(String((data as any)?.error || 'Error') + hint);
      }
      setAiResult((data as any)?.parsed || (data as any));
    } catch (e: any) {
      setAiResult(null);
      setAiError(e?.message || 'Error');
      toast.error(e?.message || 'Error');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card
        hover={false}
        className="rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="h-10 w-10 rounded-xl grid place-items-center bg-minecraft-grass/10 text-minecraft-grass border border-minecraft-grass/20 dark:border-white/10 dark:bg-white/5">
                <FaTicketAlt />
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">{t(lang, 'admin.tickets.ticketsLabel')}</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">{t(lang, 'admin.tickets.headerDesc')}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-start md:justify-end">
            <span className="px-3 py-1.5 text-xs rounded-full bg-gray-100 border border-gray-200 text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-gray-200">
              {t(lang, 'admin.tickets.total')}: {tickets.length}
            </span>
            <span className="px-3 py-1.5 text-xs rounded-full bg-gray-100 border border-gray-200 text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-gray-200">
              {t(lang, 'admin.tickets.inProgressCount')}: {inProgressTickets.length}
            </span>
            <span className="px-3 py-1.5 text-xs rounded-full bg-gray-100 border border-gray-200 text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-gray-200">
              {t(lang, 'admin.tickets.openCount')}: {openTickets.length}
            </span>
            <span className="px-3 py-1.5 text-xs rounded-full bg-gray-100 border border-gray-200 text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-gray-200">
              {t(lang, 'admin.tickets.closedCount')}: {closedTickets.length}
            </span>
          </div>
        </div>
      </Card>

      {/* Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Inbox */}
        <section className={selectedTicket ? 'xl:col-span-5' : 'xl:col-span-12'} aria-label={t(lang, 'admin.tickets.ticketsLabel')}>
          <Card
            hover={false}
            className="rounded-2xl p-0 overflow-hidden border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25"
          >
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-gray-950/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-gray-900 dark:text-white font-semibold">{t(lang, 'admin.tickets.ticketsLabel')}</div>
                <div className="text-xs text-gray-500">
                  {loading ? t(lang, 'common.loading') : `${filteredTickets.length} / ${statusTickets.length} ${t(lang, 'admin.tickets.total')}`}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label={t(lang, 'admin.tickets.ticketsLabel')}>
                <TabButton status="IN_PROGRESS" label={t(lang, 'admin.tickets.inProgress')} count={inProgressTickets.length} />
                <TabButton status="OPEN" label={t(lang, 'admin.tickets.open')} count={openTickets.length} />
                <TabButton status="CLOSED" label={t(lang, 'admin.tickets.closed')} count={closedTickets.length} />
              </div>

              <div className="mt-3 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                <div className="relative w-full md:max-w-md">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t(lang, 'admin.tickets.searchPlaceholder')}
                    className="pl-10"
                    aria-label={t(lang, 'admin.tickets.search')}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fetchTickets(undefined, { silent: true })}
                  disabled={refreshing}
                  className="w-full md:w-auto justify-center"
                >
                  <FaSyncAlt />
                  <span>{refreshing ? t(lang, 'common.loading') : t(lang, 'admin.dashboard.refresh')}</span>
                </Button>
              </div>
            </div>

            <div className="max-h-[72vh] overflow-y-auto">
              {loading ? (
                <div className="divide-y divide-gray-200 dark:divide-white/10">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-16 shimmer" />
                  ))}
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-16 text-gray-600 dark:text-gray-400 px-6">
                  {normalizedSearch ? t(lang, 'admin.tickets.noResults') : emptyText}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-white/10">
                  {filteredTickets.map((ticket) => {
                    const active = selectedTicket?._id === ticket._id;
                    return (
                      <button
                        key={ticket._id}
                        type="button"
                        onClick={() => openDetails(ticket)}
                        className={`w-full text-left px-4 py-3 transition-colors focus:outline-none focus:ring-2 focus:ring-minecraft-grass/30 ${
                          active ? 'bg-gray-50 dark:bg-white/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                        aria-current={active ? 'true' : undefined}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                                  ticket.status === 'OPEN'
                                    ? 'bg-emerald-500'
                                    : ticket.status === 'IN_PROGRESS'
                                      ? 'bg-amber-500'
                                      : 'bg-gray-400'
                                }`}
                                aria-hidden
                              />
                              <div className="text-gray-900 dark:text-white font-semibold truncate">{ticket.subject}</div>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                              {ticket.username} • {ticket.category}
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                              {t(lang, 'admin.tickets.lastActivity')}: {formatDateTime(ticket.updatedAt || ticket.createdAt)}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Details */}
        {selectedTicket ? (
          <section className="xl:col-span-7" aria-label={t(lang, 'admin.tickets.chat')}>
            <Card
              hover={false}
              className="rounded-2xl p-0 overflow-hidden border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/25"
            >
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 sticky top-[56px] xl:top-0 z-10 dark:border-white/10 dark:bg-gray-950/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">{selectedTicket.subject}</h2>
                      {getStatusBadge(selectedTicket.status)}
                      {getPriorityBadge(selectedTicket.priority)}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex flex-wrap gap-x-2 gap-y-1">
                      <span className="truncate">{selectedTicket.username}</span>
                      <span>•</span>
                      <span className="truncate">{selectedTicket.email}</span>
                      <span>•</span>
                      <span>
                        {t(lang, 'admin.tickets.created')}: {formatDateTime(selectedTicket.createdAt)}
                      </span>
                      <span>•</span>
                      <span>
                        {t(lang, 'admin.tickets.updated')}: {formatDateTime(selectedTicket.updatedAt || selectedTicket.createdAt)}
                      </span>
                    </div>
                  </div>

                  <Button variant="secondary" size="sm" onClick={closeDetails} className="shrink-0">
                    <FaTimes />
                    <span>{t(lang, 'common.close')}</span>
                  </Button>
                </div>
              </div>

              <div className="p-4 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t(lang, 'admin.tickets.statusLabel')}
                    </label>
                    <Select
                      value={selectedTicket.status}
                      onChange={(e) => updateTicket(selectedTicket._id, { status: e.target.value })}
                    >
                      <option value="OPEN">{t(lang, 'admin.tickets.status.open')}</option>
                      <option value="IN_PROGRESS">{t(lang, 'admin.tickets.status.inProgress')}</option>
                      <option value="CLOSED">{t(lang, 'admin.tickets.status.closed')}</option>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t(lang, 'admin.tickets.priorityLabel')}
                    </label>
                    <Select
                      value={selectedTicket.priority}
                      onChange={(e) => updateTicket(selectedTicket._id, { priority: e.target.value })}
                    >
                      <option value="LOW">{t(lang, 'admin.tickets.priority.low')}</option>
                      <option value="MEDIUM">{t(lang, 'admin.tickets.priority.medium')}</option>
                      <option value="HIGH">{t(lang, 'admin.tickets.priority.high')}</option>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="success"
                      onClick={() => updateTicket(selectedTicket._id, { status: 'CLOSED' })}
                      disabled={selectedTicket.status === 'CLOSED'}
                      className="w-full"
                    >
                      <span>{t(lang, 'admin.tickets.closeTicket')}</span>
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-gray-900 dark:text-white font-semibold">{t(lang, 'admin.tickets.message')}</div>
                    <span className="text-xs text-gray-500">{t(lang, 'admin.tickets.category')}: {selectedTicket.category}</span>
                  </div>
                  <div className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap bg-gray-50 border border-gray-200 p-4 rounded-lg dark:bg-black/20 dark:border-white/10">
                    {selectedTicket.message}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <div className="text-gray-900 dark:text-white font-semibold">{t(lang, 'admin.tickets.chat')}</div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {participantsLoading ? (
                        <span>{t(lang, 'common.loading')}</span>
                      ) : (
                        <span>
                          {t(lang, 'admin.tickets.participantsTitle')}: {participants.length}
                        </span>
                      )}
                      {ticketDetailsLoading ? <span>{t(lang, 'common.loading')}</span> : null}
                    </div>
                  </div>

                  {participants.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {participants.map((p) => (
                        <Badge key={p.userId} variant={p.isStaff ? 'warning' : 'info'}>
                          {p.username}
                        </Badge>
                      ))}
                    </div>
                  ) : !participantsLoading ? (
                    <div className="text-xs text-gray-500 mb-3">{t(lang, 'admin.tickets.participantsEmpty')}</div>
                  ) : null}

                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {!ticketDetailsLoading && ticketReplies.length === 0 ? (
                      <div className="text-sm text-gray-600 dark:text-gray-400">{t(lang, 'admin.tickets.noReplies')}</div>
                    ) : null}

                    {ticketReplies.map((r) => (
                      <div key={r._id} className={`flex ${r.isStaff ? 'justify-start' : 'justify-end'}`}>
                        <div
                          className={`max-w-[88%] rounded-lg p-3 border ${
                            r.isStaff
                              ? 'bg-gray-50 border-gray-200 dark:bg-gray-900/40 dark:border-white/10'
                              : 'bg-minecraft-grass/15 border-minecraft-grass/30'
                          }`}
                        >
                          <div className="text-[11px] text-gray-600 dark:text-gray-300 mb-1">
                            {r.isAi
                              ? t(lang, 'admin.tickets.aiLabel')
                              : r.isStaff
                                ? t(lang, 'admin.tickets.staff')
                                : selectedTicket.username}{' '}
                            • {formatDateTime(r.createdAt)}
                          </div>
                          <div className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">{r.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-black/20">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">IA</div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={fetchAiSuggestion}
                          disabled={aiLoading || selectedTicket.status === 'CLOSED'}
                          className="w-full sm:w-auto justify-center"
                        >
                          <span>{aiLoading ? t(lang, 'common.loading') : 'Sugerir respuesta'}</span>
                        </Button>
                      </div>

                      {aiError ? <div className="mt-2 text-xs text-red-600 dark:text-red-400">{aiError}</div> : null}

                      {aiResult ? (
                        <div className="mt-3 space-y-3">
                          {aiResult.summary ? (
                            <div>
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Resumen</div>
                              <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{aiResult.summary}</div>
                            </div>
                          ) : null}

                          {aiResult.replyDraft ? (
                            <div>
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Borrador</div>
                              <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{aiResult.replyDraft}</div>
                              <div className="mt-2">
                                <Button
                                  type="button"
                                  variant="success"
                                  size="sm"
                                  onClick={() => setReplyText(String(aiResult.replyDraft || ''))}
                                  className="w-full justify-center"
                                  disabled={selectedTicket.status === 'CLOSED'}
                                >
                                  <span>Usar borrador</span>
                                </Button>
                              </div>
                            </div>
                          ) : null}

                          {(aiResult.category || aiResult.priority || aiResult.suggestedStatus) ? (
                            <div className="flex flex-wrap gap-2">
                              {aiResult.category ? <Badge variant="info">{String(aiResult.category)}</Badge> : null}
                              {aiResult.priority ? <Badge variant="warning">{String(aiResult.priority)}</Badge> : null}
                              {aiResult.suggestedStatus ? <Badge variant="default">{String(aiResult.suggestedStatus)}</Badge> : null}
                            </div>
                          ) : null}

                          {Array.isArray(aiResult.followUpQuestions) && aiResult.followUpQuestions.length > 0 ? (
                            <div>
                              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Preguntas</div>
                              <ul className="text-sm text-gray-800 dark:text-gray-200 list-disc pl-5 space-y-1">
                                {aiResult.followUpQuestions.slice(0, 5).map((q: string, idx: number) => (
                                  <li key={idx}>{q}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <Textarea
                      rows={3}
                      placeholder={
                        selectedTicket.status === 'CLOSED'
                          ? t(lang, 'admin.tickets.replyPlaceholderClosed')
                          : t(lang, 'admin.tickets.replyPlaceholderOpen')
                      }
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      disabled={selectedTicket.status === 'CLOSED'}
                    />
                    <Button
                      type="button"
                      onClick={handleSendReply}
                      disabled={selectedTicket.status === 'CLOSED' || !replyText.trim()}
                      className="w-full"
                    >
                      <span>{t(lang, 'admin.tickets.sendReply')}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </section>
        ) : null}
      </div>
    </div>
  );
}
