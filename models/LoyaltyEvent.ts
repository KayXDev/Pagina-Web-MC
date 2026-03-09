import mongoose, { Schema, models } from 'mongoose';

export interface ILoyaltyEvent {
  _id: string;
  userId: string;
  orderId?: string;
  type: 'ORDER_EARNED';
  points: number;
  amountSpent: number;
  currency: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const LoyaltyEventSchema = new Schema<ILoyaltyEvent>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      default: '',
      index: true,
    },
    type: {
      type: String,
      enum: ['ORDER_EARNED'],
      default: 'ORDER_EARNED',
    },
    points: {
      type: Number,
      required: true,
      min: 0,
    },
    amountSpent: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'EUR',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },
  },
  { timestamps: true }
);

LoyaltyEventSchema.index({ userId: 1, createdAt: -1 });
LoyaltyEventSchema.index({ orderId: 1, type: 1 }, { unique: true, partialFilterExpression: { orderId: { $type: 'string', $ne: '' } } });

const LoyaltyEvent = models.LoyaltyEvent || mongoose.model<ILoyaltyEvent>('LoyaltyEvent', LoyaltyEventSchema);

export default LoyaltyEvent;