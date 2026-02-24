import mongoose, { Schema, models } from 'mongoose';

export interface ITicketReply {
  _id: string;
  ticketId: string;
  userId: string;
  username: string;
  message: string;
  isStaff: boolean;
  isAi?: boolean;
  createdAt: Date;
}

const TicketReplySchema = new Schema<ITicketReply>(
  {
    ticketId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
    },
    isStaff: {
      type: Boolean,
      default: false,
    },
    isAi: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const TicketReply = models.TicketReply || mongoose.model<ITicketReply>('TicketReply', TicketReplySchema);

export default TicketReply;
