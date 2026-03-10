import mongoose, { Schema, models } from 'mongoose';

export type CouponType = 'PERCENT' | 'FIXED';

export interface ICoupon {
  _id: string;
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  active: boolean;
  minOrderTotal?: number;
  maxUses?: number;
  usedCount: number;
  startsAt?: Date;
  expiresAt?: Date;
  appliesToCategories?: string[];
  appliesToProductIds?: string[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, minlength: 3, maxlength: 40 },
    description: { type: String, default: '', trim: true, maxlength: 200 },
    type: { type: String, enum: ['PERCENT', 'FIXED'], required: true, default: 'PERCENT' },
    value: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
    minOrderTotal: { type: Number, default: 0, min: 0 },
    maxUses: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date },
    expiresAt: { type: Date },
    appliesToCategories: { type: [String], default: [] },
    appliesToProductIds: { type: [String], default: [] },
    createdBy: { type: String, default: '' },
  },
  { timestamps: true }
);

CouponSchema.index({ active: 1, updatedAt: -1 });

const Coupon = models.Coupon || mongoose.model<ICoupon>('Coupon', CouponSchema);

export default Coupon;
