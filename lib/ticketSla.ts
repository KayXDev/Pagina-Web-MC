type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';

const SLA_HOURS: Record<TicketPriority, { firstResponseHours: number; resolutionHours: number }> = {
  HIGH: { firstResponseHours: 1, resolutionHours: 8 },
  MEDIUM: { firstResponseHours: 4, resolutionHours: 24 },
  LOW: { firstResponseHours: 12, resolutionHours: 72 },
};

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function getTicketSlaConfig(priority: string) {
  const normalized = String(priority || 'MEDIUM').toUpperCase() as TicketPriority;
  return SLA_HOURS[normalized] || SLA_HOURS.MEDIUM;
}

export function buildTicketSlaDates(priority: string, baseDate = new Date()) {
  const config = getTicketSlaConfig(priority);
  return {
    responseDueAt: addHours(baseDate, config.firstResponseHours),
    resolutionDueAt: addHours(baseDate, config.resolutionHours),
  };
}

export function getTicketSlaState(ticket: {
  status?: string;
  firstStaffReplyAt?: string | Date | null;
  responseDueAt?: string | Date | null;
  resolvedAt?: string | Date | null;
  resolutionDueAt?: string | Date | null;
}) {
  const now = Date.now();
  const status = String(ticket.status || '').toUpperCase();
  const firstStaffReplyAt = ticket.firstStaffReplyAt ? new Date(ticket.firstStaffReplyAt).getTime() : 0;
  const responseDueAt = ticket.responseDueAt ? new Date(ticket.responseDueAt).getTime() : 0;
  const resolvedAt = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : 0;
  const resolutionDueAt = ticket.resolutionDueAt ? new Date(ticket.resolutionDueAt).getTime() : 0;

  const responseBreached = !firstStaffReplyAt && responseDueAt && now > responseDueAt;
  const resolutionBreached = status !== 'CLOSED' && !resolvedAt && resolutionDueAt && now > resolutionDueAt;

  if (status === 'CLOSED') {
    return resolvedAt && resolutionDueAt && resolvedAt > resolutionDueAt ? 'RESOLVED_LATE' : 'RESOLVED';
  }
  if (responseBreached || resolutionBreached) return 'BREACHED';
  return 'ON_TRACK';
}