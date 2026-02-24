import mongoose, { Schema, models } from 'mongoose';

export type PartnerBookingStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELED';
export type PartnerBookingProvider = 'PAYPAL' | 'STRIPE' | 'FREE';
export type PartnerBookingKind = 'CUSTOM' | 'MONTHLY';

export interface IPartnerBooking {
  _id: string;
  adId: string;
  userId: string;

  slot: number; // 0 (VIP) or 1..10
  kind: PartnerBookingKind;
  days: number;

  currency: string;
  dailyPriceEur: number;
  discountPct: number;
  totalPrice: number;

  status: PartnerBookingStatus;
  provider: PartnerBookingProvider;

  // Optional note (required for free slot requests)
  requestNote?: string;

  // used to prevent double-booking the same slot (partial unique index)
  slotActiveKey: string;

  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeStatus?: string;
  stripePaymentStatus?: string;

  paypalOrderId?: string;
  paypalCaptureId?: string;
  paypalStatus?: string;
  paypalPayerId?: string;
  paypalPayerEmail?: string;

  ip?: string;
  userAgent?: string;

  paidAt?: Date;
  startsAt?: Date;
  endsAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const PartnerBookingSchema = new Schema<IPartnerBooking>(
  {
    adId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },

    slot: { type: Number, required: true, min: 0, max: 10, index: true },
    kind: { type: String, enum: ['CUSTOM', 'MONTHLY'], required: true },
    days: { type: Number, required: true, min: 1, max: 90 },

    currency: { type: String, default: 'EUR' },
    dailyPriceEur: { type: Number, required: true, min: 0 },
    discountPct: { type: Number, required: true, min: 0, max: 100 },
    totalPrice: { type: Number, required: true, min: 0 },

    status: { type: String, enum: ['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELED'], default: 'PENDING', index: true },
    provider: { type: String, enum: ['PAYPAL', 'STRIPE', 'FREE'], required: true, index: true },

    requestNote: { type: String, default: '' },

    slotActiveKey: { type: String, required: true, default: '' },

    stripeCheckoutSessionId: { type: String, default: '' },
    stripePaymentIntentId: { type: String, default: '' },
    stripeStatus: { type: String, default: '' },
    stripePaymentStatus: { type: String, default: '' },

    paypalOrderId: { type: String, default: '' },
    paypalCaptureId: { type: String, default: '' },
    paypalStatus: { type: String, default: '' },
    paypalPayerId: { type: String, default: '' },
    paypalPayerEmail: { type: String, default: '' },

    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },

    paidAt: { type: Date },
    startsAt: { type: Date },
    endsAt: { type: Date, index: true },
  },
  { timestamps: true }
);

PartnerBookingSchema.index({ status: 1, endsAt: 1 });
PartnerBookingSchema.index({ slot: 1, status: 1, endsAt: 1 });
PartnerBookingSchema.index({ userId: 1, createdAt: -1 });

// Enforce at most one active/pending booking per slot.
PartnerBookingSchema.index(
  { slotActiveKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['PENDING', 'ACTIVE'] },
    },
  }
);

const PartnerBooking = models.PartnerBooking || mongoose.model<IPartnerBooking>('PartnerBooking', PartnerBookingSchema);

export default PartnerBooking;
