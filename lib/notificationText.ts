import { normalizeLang, type Lang } from '@/lib/i18n';

type NotificationText = {
  title: string;
  message: string;
};

const TITLE_ES_TO_EN: Record<string, string> = {
  'Ticket cerrado': 'Ticket closed',
  'Nuevo ticket de soporte': 'New support ticket',
  'Nuevo seguidor': 'New follower',
  'Postulación aceptada': 'Application accepted',
  'Postulación rechazada': 'Application rejected',
  'Respuesta en tu ticket': 'Reply in your ticket',
  'Nueva noticia': 'New announcement',
  'Nuevo post en el foro': 'New forum post',
  'Nueva respuesta en tu publicación': 'New reply in your post',
};

function translateMessageEsToEn(message: string): string {
  const text = String(message || '').trim();
  if (!text) return text;

  if (text === 'Tu ticket fue cerrado por el staff. Si necesitas más ayuda, puedes abrir otro ticket.') {
    return 'Your ticket was closed by staff. If you need more help, you can open another ticket.';
  }

  if (text === 'El staff respondió a tu ticket. Entra a soporte para ver el mensaje.') {
    return 'Staff replied to your ticket. Open support to view the message.';
  }

  if (text === 'Tu postulación a staff fue aceptada. Se abrió un chat para hablar con el staff.') {
    return 'Your staff application was accepted. A chat was opened so you can talk with staff.';
  }

  if (text === 'Tu postulación a staff fue aceptada. Te contactaremos pronto.') {
    return 'Your staff application was accepted. We will contact you soon.';
  }

  if (text === 'Tu postulación a staff fue rechazada. Gracias por postular.') {
    return 'Your staff application was rejected. Thanks for applying.';
  }

  const newTicket = text.match(/^Nuevo ticket creado por\s+(.+)\.$/);
  if (newTicket) return `New ticket created by ${newTicket[1]}.`;

  const followedYou = text.match(/^(.+?)\s+empezó a seguirte\.$/);
  if (followedYou) return `${followedYou[1]} started following you.`;

  const forumPosted = text.match(/^(.+?)\s+publicó:\s+(.+)$/);
  if (forumPosted) return `${forumPosted[1]} posted: ${forumPosted[2]}`;

  const forumReply = text.match(/^(.+?)\s+respondió:\s+(.+)$/);
  if (forumReply) return `${forumReply[1]} replied: ${forumReply[2]}`;

  return text;
}

export function localizeNotificationText(rawLang: string | undefined | null, input: NotificationText): NotificationText {
  const lang: Lang = normalizeLang(rawLang);
  const title = String(input.title || '');
  const message = String(input.message || '');

  if (lang !== 'en') {
    return { title, message };
  }

  return {
    title: TITLE_ES_TO_EN[title] || title,
    message: translateMessageEsToEn(message),
  };
}
