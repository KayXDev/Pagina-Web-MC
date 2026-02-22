import mongoose, { Schema, models } from 'mongoose';

export type ShopDeliveryStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IShopDelivery {
  _id: string;
  orderId: string;
  userId?: string;
  minecraftUsername: string;
  minecraftUuid: string;
  commands: string[];
  status: ShopDeliveryStatus;
  attempts: number;
  lastError?: string;
  lockedAt?: Date;
  lockedBy?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ShopDeliverySchema = new Schema<IShopDelivery>(
  {
    orderId: { type: String, required: true, trim: true, unique: true },
    userId: { type: String, default: '' },
    minecraftUsername: { type: String, required: true, trim: true },
    minecraftUuid: { type: String, required: true, trim: true },
    commands: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: '' },
    lockedAt: { type: Date },
    lockedBy: { type: String, default: '' },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

ShopDeliverySchema.index({ status: 1, createdAt: 1 });
ShopDeliverySchema.index({ minecraftUuid: 1, createdAt: -1 });

const ShopDelivery = models.ShopDelivery || mongoose.model<IShopDelivery>('ShopDelivery', ShopDeliverySchema);

export default ShopDelivery;
