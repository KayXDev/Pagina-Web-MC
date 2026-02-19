import mongoose, { Schema, models } from 'mongoose';

export interface ITicketPresence {
  _id: string;
  ticketId: string;
  userId: string;
  username: string;
  isStaff: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TicketPresenceSchema = new Schema<ITicketPresence>(
  {
    ticketId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    isStaff: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

TicketPresenceSchema.index({ ticketId: 1, userId: 1 }, { unique: true });
TicketPresenceSchema.index({ ticketId: 1, lastSeen: -1 });

const TicketPresence = models.TicketPresence || mongoose.model<ITicketPresence>('TicketPresence', TicketPresenceSchema);

export default TicketPresence;
