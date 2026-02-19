'use client';

import TicketChatView from '@/components/support/TicketChatView';

export default function AdminPostulacionesChatPage({ params }: { params: { id: string } }) {
  const ticketId = params.id;
  return (
    <TicketChatView
      ticketId={ticketId}
      backHref="/admin/postulaciones"
      callbackUrl={`/admin/postulaciones/chat/${ticketId}`}
    />
  );
}
