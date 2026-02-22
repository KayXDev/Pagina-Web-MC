import mongoose, { Schema, models } from 'mongoose';

export type ShopOrderStatus = 'PENDING' | 'PAID' | 'DELIVERED' | 'CANCELED';
export type ShopOrderProvider = 'MANUAL' | 'PAYPAL' | 'STRIPE';

export interface IShopOrderItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface IShopOrder {
  _id: string;
  userId?: string;
  minecraftUsername: string;
  minecraftUuid: string;
  // Backward-compatible single-product fields
  productId?: string;
  productName?: string;
  productPrice?: number;

  // New multi-item fields
  items?: IShopOrderItem[];
  totalPrice?: number;
  currency: string;
  status: ShopOrderStatus;
  provider: ShopOrderProvider;

  // PayPal metadata (only when provider === 'PAYPAL')
  paypalOrderId?: string;
  paypalCaptureId?: string;
  paypalPayerId?: string;
  paypalPayerEmail?: string;
  paypalStatus?: string;

  // Stripe metadata (only when provider === 'STRIPE')
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeStatus?: string;
  stripePaymentStatus?: string;
  paidAt?: Date;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShopOrderSchema = new Schema<IShopOrder>(
  {
    userId: { type: String, default: '' },
    minecraftUsername: { type: String, required: true, trim: true },
    minecraftUuid: { type: String, required: true, trim: true },
    productId: { type: String, default: '' },
    productName: { type: String, default: '' },
    productPrice: { type: Number, default: 0 },
    items: {
      type: [
        {
          productId: { type: String, required: true },
          productName: { type: String, required: true },
          unitPrice: { type: Number, required: true },
          quantity: { type: Number, required: true, min: 1, max: 99 },
          lineTotal: { type: Number, required: true },
        },
      ],
      default: [],
    },
    totalPrice: { type: Number, default: 0 },
    currency: { type: String, default: 'EUR' },
    status: { type: String, enum: ['PENDING', 'PAID', 'DELIVERED', 'CANCELED'], default: 'PENDING' },
    provider: { type: String, enum: ['MANUAL', 'PAYPAL', 'STRIPE'], default: 'MANUAL' },

    paypalOrderId: { type: String, default: '' },
    paypalCaptureId: { type: String, default: '' },
    paypalPayerId: { type: String, default: '' },
    paypalPayerEmail: { type: String, default: '' },
    paypalStatus: { type: String, default: '' },

    stripeCheckoutSessionId: { type: String, default: '' },
    stripePaymentIntentId: { type: String, default: '' },
    stripeStatus: { type: String, default: '' },
    stripePaymentStatus: { type: String, default: '' },
    paidAt: { type: Date },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

// Useful indexes (not unique to avoid migrations issues)
ShopOrderSchema.index({ status: 1, createdAt: -1 });
ShopOrderSchema.index({ minecraftUuid: 1, createdAt: -1 });
ShopOrderSchema.index({ userId: 1, createdAt: -1 });
ShopOrderSchema.index({ paypalOrderId: 1, createdAt: -1 });
ShopOrderSchema.index({ stripeCheckoutSessionId: 1, createdAt: -1 });
ShopOrderSchema.index({ stripePaymentIntentId: 1, createdAt: -1 });

const ShopOrder = models.ShopOrder || mongoose.model<IShopOrder>('ShopOrder', ShopOrderSchema);

export default ShopOrder;
