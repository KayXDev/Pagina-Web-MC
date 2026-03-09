import mongoose, { Schema, models } from 'mongoose';

export interface ITicket {
  _id: string;
  kind?: 'SUPPORT' | 'APPLICATION';
  userId: string;
  username: string;
  email: string;
  subject: string;
  category: 'TECHNICAL' | 'BILLING' | 'BAN_APPEAL' | 'REPORT' | 'OTHER';
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedAt?: Date;
  firstStaffReplyAt?: Date;
  responseDueAt?: Date;
  resolutionDueAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    kind: {
      type: String,
      enum: ['SUPPORT', 'APPLICATION'],
      default: 'SUPPORT',
    },
    userId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['TECHNICAL', 'BILLING', 'BAN_APPEAL', 'REPORT', 'OTHER'],
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'CLOSED'],
      default: 'OPEN',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM',
    },
    assignedStaffId: {
      type: String,
      default: '',
    },
    assignedStaffName: {
      type: String,
      default: '',
    },
    assignedAt: {
      type: Date,
    },
    firstStaffReplyAt: {
      type: Date,
    },
    responseDueAt: {
      type: Date,
    },
    resolutionDueAt: {
      type: Date,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Ticket = models.Ticket || mongoose.model<ITicket>('Ticket', TicketSchema);

export default Ticket;
