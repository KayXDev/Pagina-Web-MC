'use client';

import TicketChatView from '@/components/support/TicketChatView';

export default function SoporteTicketPage({ params }: { params: { id: string } }) {
  const ticketId = params.id;
  return <TicketChatView ticketId={ticketId} backHref="/soporte" callbackUrl={`/soporte/${ticketId}`} />;
}
