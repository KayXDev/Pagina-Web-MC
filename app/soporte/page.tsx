'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaEnvelope, FaPaperPlane, FaTicketAlt } from 'react-icons/fa';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card, Input, Textarea, Select, Button, Badge } from '@/components/ui';
import { toast } from 'react-toastify';
import { getClientLangFromCookie, getDateLocale, type Lang, t } from '@/lib/i18n';

interface Ticket {
  _id: string;
  subject: string;
  category: string;
  status: string;
  createdAt: string;
  message?: string;
}

export default function SoportePage() {
  const { status } = useSession();
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('es');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [formData, setFormData] = useState({
    subject: '',
    category: 'TECHNICAL',
    message: '',
  });

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/soporte');
    }

    if (status === 'authenticated') {
      fetchTickets();
    }
  }, [status, router]);

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/tickets');
      if (response.ok) {
        const data = await response.json();
        const activeTickets = Array.isArray(data)
          ? data.filter((t: Ticket) => t.status !== 'CLOSED')
          : [];

        setTickets(activeTickets);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t(lang, 'support.createError'));
      }

      toast.success(t(lang, 'support.createSuccess'));
      setFormData({
        subject: '',
        category: 'TECHNICAL',
        message: '',
      });
      await fetchTickets();
    } catch (error: any) {
      toast.error(error.message || t(lang, 'support.createError'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="success">{t(lang, 'support.status.open')}</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="warning">{t(lang, 'support.status.inProgress')}</Badge>;
      case 'CLOSED':
        return <Badge variant="default">{t(lang, 'support.status.closed')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen py-20 px-4 flex items-center justify-center">
        <div className="text-white text-xl">{t(lang, 'common.loading')}</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <PageHeader
        title={t(lang, 'support.title')}
        description={t(lang, 'support.headerDesc')}
        icon={<FaEnvelope className="text-6xl text-minecraft-grass" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Ticket Form */}
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-6">{t(lang, 'support.createTicket')}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t(lang, 'support.subject')}{' '}
                  {formData.subject.length > 0 && (
                    <span className={formData.subject.length >= 5 ? 'text-green-500' : 'text-yellow-500'}>
                      ({formData.subject.length}/5)
                    </span>
                  )}
                </label>
                <Input
                  type="text"
                  placeholder={t(lang, 'support.subjectPlaceholder')}
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  minLength={5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t(lang, 'support.categoryLabel')}
                </label>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  <option value="TECHNICAL">{t(lang, 'support.category.technical')}</option>
                  <option value="BILLING">{t(lang, 'support.category.billing')}</option>
                  <option value="BAN_APPEAL">{t(lang, 'support.category.banAppeal')}</option>
                  <option value="REPORT">{t(lang, 'support.category.report')}</option>
                  <option value="OTHER">{t(lang, 'support.category.other')}</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t(lang, 'support.messageLabel')}{' '}
                  {formData.message.length > 0 && (
                    <span className={formData.message.length >= 20 ? 'text-green-500' : 'text-yellow-500'}>
                      ({formData.message.length}/20)
                    </span>
                  )}
                </label>
                <Textarea
                  placeholder={t(lang, 'support.messagePlaceholder')}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={6}
                  required
                  minLength={20}
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading || formData.subject.length < 5 || formData.message.length < 20} 
                className="w-full"
              >
                {loading ? (
                  <span>{t(lang, 'support.sending')}</span>
                ) : (
                  <>
                    <FaPaperPlane />
                    <span>{t(lang, 'support.sendTicket')}</span>
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* My Tickets */}
        <div>
          <Card>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <FaTicketAlt className="mr-2" />
              {t(lang, 'support.myTickets')}
            </h2>
            <div className="space-y-3">
              {tickets.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  {t(lang, 'support.noActiveTickets')}
                </p>
              ) : (
                tickets.map((ticket) => (
                  <Link
                    key={ticket._id}
                    href={`/soporte/${ticket._id}`}
                    className="block"
                  >
                    <div className="bg-gray-900/50 border border-gray-700 hover:border-minecraft-grass rounded-md p-4 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-white font-medium">{ticket.subject}</h3>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <p className="text-sm text-gray-400">
                      {new Date(ticket.createdAt).toLocaleDateString(getDateLocale(lang))}
                    </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>

          {/* Info */}
          <Card className="mt-6 bg-minecraft-diamond/10 border-minecraft-diamond">
            <h3 className="text-white font-semibold mb-2">{t(lang, 'support.infoTitle')}</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• {t(lang, 'support.info1')}</li>
              <li>• {t(lang, 'support.info2')}</li>
              <li>• {t(lang, 'support.info3')}</li>
              <li>• {t(lang, 'support.info4')}</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
