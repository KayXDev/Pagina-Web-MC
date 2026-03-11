import mongoose, { Schema, models } from 'mongoose';

export interface IRewardClaim {
  _id: string;
  userId: string;
  rewardKey: string;
  rewardTitle: string;
  pointsAwarded?: number;
  balanceAwarded?: number;
  createdAt: Date;
  updatedAt: Date;
}

const RewardClaimSchema = new Schema<IRewardClaim>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    rewardKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    rewardTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    pointsAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

RewardClaimSchema.index({ userId: 1, rewardKey: 1 }, { unique: true });
RewardClaimSchema.index({ userId: 1, createdAt: -1 });

const RewardClaim = models.RewardClaim || mongoose.model<IRewardClaim>('RewardClaim', RewardClaimSchema);

export default RewardClaim;