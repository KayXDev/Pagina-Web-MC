'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FaArrowLeft, FaTicketAlt } from 'react-icons/fa';
import PageHeader from '@/components/PageHeader';
import { Badge, Button, Card, Textarea } from '@/components/ui';
import { toast } from 'react-toastify';
import { getClientLangFromCookie, getDateLocale, type Lang, t } from '@/lib/i18n';

interface Ticket {
  _id: string;
  subject: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  message: string;
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

export default function TicketChatView({
  ticketId,
  backHref,
  callbackUrl,
  embedded = false,
}: {
  ticketId: string;
  backHref: string;
  callbackUrl: string;
  embedded?: boolean;
}) {
  const { status } = useSession();
  const router = useRouter();

  const [lang, setLang] = useState<Lang>('es');
  const [loading, setLoading] = useState(true);
  const [ticketDetails, setTicketDetails] = useState<{ ticket: Ticket; replies: TicketReply[] } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [closing, setClosing] = useState(false);

  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const fetchingDetailsRef = useRef(false);

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [status, router, callbackUrl]);

  const fetchTicketDetails = async () => {
    if (!ticketId) return;
    if (fetchingDetailsRef.current) return;

    fetchingDetailsRef.current = true;
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as any).error || t(lang, 'support.loadTicketError'));
      }
      setTicketDetails(data as any);
    } catch (error: any) {
      toast.error(error?.message || t(lang, 'support.loadTicketError'));
      setTicketDetails(null);
    } finally {
      fetchingDetailsRef.current = false;
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    if (!ticketId) return;
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

  const heartbeat = async () => {
    if (!ticketId) return;
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
    if (status !== 'authenticated') return;

    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await Promise.all([fetchTicketDetails(), heartbeat(), fetchParticipants()]);
    };

    run();

    const detailsInterval = setInterval(() => {
      fetchTicketDetails();
    }, 4000);

    const presenceInterval = setInterval(() => {
      heartbeat();
      fetchParticipants();
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(detailsInterval);
      clearInterval(presenceInterval);
      fetch(`/api/tickets/${ticketId}/presence`, { method: 'DELETE' }).catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, ticketId, lang]);

  const handleSendReply = async () => {
    if (!ticketId) return;
    if (!replyText.trim()) return;

    try {
      const response = await fetch(`/api/tickets/${ticketId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as any).error || t(lang, 'support.replyError'));
      }

      setReplyText('');
      await fetchTicketDetails();
      await fetchParticipants();
    } catch (error: any) {
      toast.error(error?.message || t(lang, 'support.replyError'));
    }
  };

  const handleCloseTicket = async () => {
    if (!ticketId) return;
    setClosing(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as any).error || t(lang, 'support.closeError'));
      }

      toast.success(t(lang, 'support.closeSuccess'));
      await fetchTicketDetails();
    } catch (error: any) {
      toast.error(error?.message || t(lang, 'support.closeError'));
    } finally {
      setClosing(false);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'OPEN':
        return <Badge variant="success">{t(lang, 'support.status.open')}</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="warning">{t(lang, 'support.status.inProgress')}</Badge>;
      case 'CLOSED':
        return <Badge variant="default">{t(lang, 'support.status.closed')}</Badge>;
      default:
        return <Badge>{s}</Badge>;
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen py-20 px-4 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white text-xl">{t(lang, 'common.loading')}</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className={embedded ? 'space-y-6' : 'min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto'}>
      {embedded ? (
        <Card
          className="border border-gray-200 bg-white/80 dark:border-white/10 dark:bg-gray-950/25 rounded-2xl"
          hover={false}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-gray-50 border border-gray-200 dark:bg-white/5 dark:border-white/10 grid place-items-center text-gray-900 dark:text-white">
                <FaTicketAlt />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
                  {t(lang, 'support.ticketChat')}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">{t(lang, 'support.ticketChatHelp')}</p>
              </div>
            </div>

            <Link
              href={backHref}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-gray-200 bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:text-white dark:hover:bg-white/10"
            >
              <FaArrowLeft />
              <span>{t(lang, 'common.back')}</span>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <PageHeader
            title={t(lang, 'support.ticketChat')}
            description={t(lang, 'support.ticketChatHelp')}
            icon={<FaTicketAlt className="text-5xl text-minecraft-grass" />}
          />

          <div className="mb-6">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              <FaArrowLeft />
              <span>{t(lang, 'common.back')}</span>
            </Link>
          </div>
        </>
      )}

      <Card
        hover={false}
        className={
          embedded
            ? 'border border-gray-200 bg-white/80 dark:border-white/10 dark:bg-gray-950/25 rounded-2xl'
            : 'border border-gray-200 dark:border-gray-800'
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                {ticketDetails?.ticket?.subject || t(lang, 'support.ticketChat')}
              </h2>
              {ticketDetails?.ticket?.status ? getStatusBadge(ticketDetails.ticket.status) : null}
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{t(lang, 'support.ticketChatHelp')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              onClick={handleCloseTicket}
              disabled={closing || !ticketDetails?.ticket || ticketDetails.ticket.status === 'CLOSED'}
            >
              {t(lang, 'support.closeTicket')}
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="text-gray-400">{t(lang, 'support.loadingConversation')}</div>
            ) : !ticketDetails ? (
              <div className="text-gray-400">{t(lang, 'support.cannotLoadTicket')}</div>
            ) : (
              <>
                <div className="space-y-3 max-h-[520px] overflow-y-auto">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-minecraft-grass/10 dark:bg-minecraft-grass/20 border border-minecraft-grass/30 rounded-md p-3">
                      <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                        {t(lang, 'support.you')} • {new Date(ticketDetails.ticket.createdAt).toLocaleString(getDateLocale(lang))}
                      </div>
                      <div className="text-gray-900 dark:text-white whitespace-pre-wrap">{ticketDetails.ticket.message}</div>
                    </div>
                  </div>

                  {ticketDetails.replies.map((r) => (
                    <div key={r._id} className={`flex ${r.isStaff ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`max-w-[85%] rounded-md p-3 border ${
                          r.isStaff
                            ? 'bg-gray-100 border-gray-200 dark:bg-gray-900/60 dark:border-gray-700'
                            : 'bg-minecraft-grass/10 dark:bg-minecraft-grass/20 border-minecraft-grass/30'
                        }`}
                      >
                        <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                          {r.isStaff ? t(lang, 'support.staffLabel') : t(lang, 'support.you')} •{' '}
                          {new Date(r.createdAt).toLocaleString(getDateLocale(lang))}
                        </div>
                        <div className="text-gray-900 dark:text-white whitespace-pre-wrap">{r.message}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-3">
                  <Textarea
                    rows={3}
                    placeholder={
                      ticketDetails.ticket.status === 'CLOSED'
                        ? t(lang, 'support.ticketClosedPlaceholder')
                        : t(lang, 'support.replyPlaceholder')
                    }
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={ticketDetails.ticket.status === 'CLOSED'}
                  />
                  <Button
                    type="button"
                    onClick={handleSendReply}
                    disabled={ticketDetails.ticket.status === 'CLOSED' || !replyText.trim()}
                    className="w-full"
                  >
                    {t(lang, 'support.sendReply')}
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="w-full md:w-64 shrink-0">
            <div className="text-gray-900 dark:text-white font-semibold mb-2">
              {t(lang, 'support.participantsTitle')}{' '}
              <span className="text-gray-400 font-normal">({participants.length})</span>
            </div>
            <div className="bg-gray-50 border border-gray-200 dark:bg-black/30 dark:border-gray-800 rounded-md p-3">
              {participantsLoading ? (
                <div className="text-sm text-gray-500">{t(lang, 'common.loading')}</div>
              ) : participants.length === 0 ? (
                <div className="text-sm text-gray-500">{t(lang, 'support.participantsEmpty')}</div>
              ) : (
                <div className="space-y-2">
                  {participants.map((p) => (
                    <div key={p.userId} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm text-gray-900 dark:text-gray-200 truncate">{p.username}</div>
                        <div className="text-xs text-gray-500">
                          {p.isStaff ? t(lang, 'support.participantStaff') : t(lang, 'support.participantUser')}
                        </div>
                      </div>
                      <Badge variant={p.isStaff ? 'warning' : 'info'}>
                        {p.isStaff ? t(lang, 'support.staffLabel') : t(lang, 'support.participantUser')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
