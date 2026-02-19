'use client';

import { useEffect, useRef, useState } from 'react';
import { FaTicketAlt, FaTimes } from 'react-icons/fa';
import { Card, Badge, Button, Select, Textarea } from '@/components/ui';
import { toast } from 'react-toastify';
import { formatDateTime } from '@/lib/utils';
import { getClientLangFromCookie, t, type Lang } from '@/lib/i18n';

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
  createdAt: string;
}

type Participant = {
  userId: string;
  username: string;
  isStaff: boolean;
  lastSeen: string;
};

export default function AdminTicketsPage() {
  const [lang, setLang] = useState<Lang>('es');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketDetailsLoading, setTicketDetailsLoading] = useState(false);
  const [ticketReplies, setTicketReplies] = useState<TicketReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [activeStatus, setActiveStatus] = useState<'IN_PROGRESS' | 'OPEN' | 'CLOSED'>('IN_PROGRESS');

  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const liveFetchRef = useRef(false);

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/admin/tickets');
      if (!response.ok) throw new Error(t(lang, 'admin.tickets.loadError'));
      const data = await response.json();
      setTickets(data);

      // Pick a sane default tab based on what exists.
      const list = Array.isArray(data) ? (data as Ticket[]) : [];
      const hasInProgress = list.some((t) => t.status === 'IN_PROGRESS');
      const hasOpen = list.some((t) => t.status === 'OPEN');
      const hasClosed = list.some((t) => t.status === 'CLOSED');
      setActiveStatus(hasInProgress ? 'IN_PROGRESS' : hasOpen ? 'OPEN' : hasClosed ? 'CLOSED' : 'OPEN');
    } catch (error) {
      toast.error(t(lang, 'admin.tickets.loadError'));
    } finally {
      setLoading(false);
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
      fetchTickets();
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
      await fetchTickets();
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

  const filteredTickets =
    activeStatus === 'IN_PROGRESS'
      ? inProgressTickets
      : activeStatus === 'OPEN'
        ? openTickets
        : closedTickets;

  const emptyText =
    activeStatus === 'IN_PROGRESS'
      ? t(lang, 'admin.tickets.emptyInProgress')
      : activeStatus === 'OPEN'
        ? t(lang, 'admin.tickets.emptyOpen')
        : t(lang, 'admin.tickets.emptyClosed');

  const openDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setReplyText('');
  };

  const closeDetails = () => {
    if (selectedTicket?._id) {
      fetch(`/api/tickets/${selectedTicket._id}/presence`, { method: 'DELETE' }).catch(() => undefined);
    }
    setSelectedTicket(null);
    setTicketReplies([]);
    setReplyText('');
    setParticipants([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card hover={false} className="border-gray-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <FaTicketAlt className="text-minecraft-grass" />
              <h1 className="text-3xl font-bold text-white">{t(lang, 'admin.tickets.ticketsLabel')}</h1>
            </div>
            <p className="text-gray-400">{t(lang, 'admin.tickets.headerDesc')}</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-start md:justify-end">
            <Badge variant="info">
              {t(lang, 'admin.tickets.total')}: {tickets.length}
            </Badge>
            <Badge variant="warning">
              {t(lang, 'admin.tickets.inProgressCount')}: {inProgressTickets.length}
            </Badge>
            <Badge variant="success">
              {t(lang, 'admin.tickets.openCount')}: {openTickets.length}
            </Badge>
            <Badge variant="default">
              {t(lang, 'admin.tickets.closedCount')}: {closedTickets.length}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeStatus === 'IN_PROGRESS' ? 'success' : 'secondary'}
          onClick={() => setActiveStatus('IN_PROGRESS')}
        >
          <span>{t(lang, 'admin.tickets.inProgress')}</span>
          <Badge variant="warning">{inProgressTickets.length}</Badge>
        </Button>
        <Button
          variant={activeStatus === 'OPEN' ? 'success' : 'secondary'}
          onClick={() => setActiveStatus('OPEN')}
        >
          <span>{t(lang, 'admin.tickets.open')}</span>
          <Badge variant="success">{openTickets.length}</Badge>
        </Button>
        <Button
          variant={activeStatus === 'CLOSED' ? 'success' : 'secondary'}
          onClick={() => setActiveStatus('CLOSED')}
        >
          <span>{t(lang, 'admin.tickets.closed')}</span>
          <Badge variant="default">{closedTickets.length}</Badge>
        </Button>
      </div>

      {/* List + Chat panel */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className={selectedTicket ? 'xl:col-span-3' : 'xl:col-span-5'}>
          {loading ? (
            <Card className="shimmer h-40" hover={false} />
          ) : filteredTickets.length === 0 ? (
            <Card hover={false} className="border-gray-800">
              <div className="text-center py-16 text-gray-400">{emptyText}</div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
              {filteredTickets.map((ticket) => (
                <button
                  key={ticket._id}
                  type="button"
                  onClick={() => openDetails(ticket)}
                  className="text-left"
                >
                  <Card
                    hover={false}
                    className={`border-gray-800 transition-colors hover:border-gray-700 ${
                      selectedTicket?._id === ticket._id ? 'border-minecraft-grass' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white font-semibold truncate">{ticket.subject}</div>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {ticket.username} • {ticket.category}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      {t(lang, 'admin.tickets.lastActivity')}: {formatDateTime(ticket.updatedAt || ticket.createdAt)}
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedTicket ? (
          <div className="xl:col-span-2">
            <Card hover={false} className="border-gray-800">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold text-white truncate">{selectedTicket.subject}</h2>
                  <div className="text-sm text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span>{selectedTicket.username}</span>
                    <span>•</span>
                    <span>{selectedTicket.email}</span>
                    <span>•</span>
                    <span>{t(lang, 'admin.tickets.created')}: {formatDateTime(selectedTicket.createdAt)}</span>
                    <span>•</span>
                    <span>{t(lang, 'admin.tickets.updated')}: {formatDateTime(selectedTicket.updatedAt || selectedTicket.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {getStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}
                  <Button variant="secondary" size="sm" onClick={closeDetails}>
                    <FaTimes />
                    <span>{t(lang, 'common.close')}</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t(lang, 'admin.tickets.statusLabel')}</label>
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
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t(lang, 'admin.tickets.priorityLabel')}</label>
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
                  <div className="text-white font-semibold mb-2">{t(lang, 'admin.tickets.message')}</div>
                  <div className="text-gray-300 whitespace-pre-wrap bg-black/30 border border-gray-800 p-4 rounded-md">
                    {selectedTicket.message}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white font-semibold">{t(lang, 'admin.tickets.chat')}</div>
                    <div className="flex items-center gap-3">
                      {participantsLoading ? (
                        <span className="text-xs text-gray-500">{t(lang, 'common.loading')}</span>
                      ) : (
                        <span className="text-xs text-gray-500">
                          {t(lang, 'admin.tickets.participantsTitle')}: {participants.length}
                        </span>
                      )}
                      {ticketDetailsLoading ? (
                        <span className="text-xs text-gray-500">{t(lang, 'common.loading')}</span>
                      ) : null}
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
                      <div className="text-sm text-gray-400">{t(lang, 'admin.tickets.noReplies')}</div>
                    ) : null}

                    {ticketReplies.map((r) => (
                      <div key={r._id} className={`flex ${r.isStaff ? 'justify-start' : 'justify-end'}`}>
                        <div
                          className={`max-w-[85%] rounded-md p-3 border ${
                            r.isStaff
                              ? 'bg-gray-900/60 border-gray-700'
                              : 'bg-minecraft-grass/20 border-minecraft-grass/30'
                          }`}
                        >
                          <div className="text-xs text-gray-300 mb-1">
                            {r.isStaff ? t(lang, 'admin.tickets.staff') : selectedTicket.username} • {formatDateTime(r.createdAt)}
                          </div>
                          <div className="text-white whitespace-pre-wrap">{r.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-3">
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
