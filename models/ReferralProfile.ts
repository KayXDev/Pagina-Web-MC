import mongoose, { Schema, models } from 'mongoose';

export interface IReferralProfile {
  _id: string;
  userId: string;
  code: string;
  active: boolean;
  invitesCount: number;
  successfulInvites: number;
  totalDiscountGiven: number;
  totalRewardsGiven: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralProfileSchema = new Schema<IReferralProfile>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, minlength: 4, maxlength: 32 },
    active: { type: Boolean, default: true },
    invitesCount: { type: Number, default: 0, min: 0 },
    successfulInvites: { type: Number, default: 0, min: 0 },
    totalDiscountGiven: { type: Number, default: 0, min: 0 },
    totalRewardsGiven: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

ReferralProfileSchema.index({ userId: 1 }, { unique: true });
ReferralProfileSchema.index({ code: 1 }, { unique: true });

const ReferralProfile =
  models.ReferralProfile || mongoose.model<IReferralProfile>('ReferralProfile', ReferralProfileSchema);

export default ReferralProfile;
