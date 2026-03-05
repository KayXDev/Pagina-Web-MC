import mongoose, { Schema, models } from 'mongoose';

export interface IReferralEvent {
  _id: string;
  orderId: string;
  referrerUserId: string;
  referredUserId?: string;
  referralCode: string;
  discountAmount: number;
  rewardAmount: number;
  status: 'PENDING' | 'REWARDED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
}

const ReferralEventSchema = new Schema<IReferralEvent>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    referrerUserId: { type: String, required: true, index: true },
    referredUserId: { type: String, default: '', index: true },
    referralCode: { type: String, required: true, uppercase: true, trim: true },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    rewardAmount: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ['PENDING', 'REWARDED', 'REJECTED'], default: 'PENDING' },
  },
  { timestamps: true }
);

const ReferralEvent = models.ReferralEvent || mongoose.model<IReferralEvent>('ReferralEvent', ReferralEventSchema);

export default ReferralEvent;
