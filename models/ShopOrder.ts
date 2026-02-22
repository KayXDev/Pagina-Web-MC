import mongoose, { Schema, models } from 'mongoose';

export type ShopOrderStatus = 'PENDING' | 'PAID' | 'DELIVERED' | 'CANCELED';

export interface IShopOrder {
  _id: string;
  userId?: string;
  minecraftUsername: string;
  minecraftUuid: string;
  productId: string;
  productName: string;
  productPrice: number;
  currency: string;
  status: ShopOrderStatus;
  provider: 'MANUAL';
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
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    productPrice: { type: Number, required: true },
    currency: { type: String, default: 'EUR' },
    status: { type: String, enum: ['PENDING', 'PAID', 'DELIVERED', 'CANCELED'], default: 'PENDING' },
    provider: { type: String, enum: ['MANUAL'], default: 'MANUAL' },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

// Useful indexes (not unique to avoid migrations issues)
ShopOrderSchema.index({ status: 1, createdAt: -1 });
ShopOrderSchema.index({ minecraftUuid: 1, createdAt: -1 });
ShopOrderSchema.index({ userId: 1, createdAt: -1 });

const ShopOrder = models.ShopOrder || mongoose.model<IShopOrder>('ShopOrder', ShopOrderSchema);

export default ShopOrder;
