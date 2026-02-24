import mongoose, { Schema, models } from 'mongoose';

export type PartnerAdStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface IPartnerAd {
  _id: string;
  userId: string;
  ownerUsername: string;

  serverName: string;
  address: string;
  version?: string;
  description: string;

  website?: string;
  discord?: string;
  banner?: string;

  status: PartnerAdStatus;
  rejectionReason?: string;
  submissionNote?: string;

  createdAt: Date;
  updatedAt: Date;
}

const PartnerAdSchema = new Schema<IPartnerAd>(
  {
    userId: { type: String, required: true },
    ownerUsername: { type: String, required: true, trim: true },

    serverName: { type: String, required: true, trim: true, maxlength: 60 },
    address: { type: String, required: true, trim: true, maxlength: 80 },
    version: { type: String, default: '', trim: true, maxlength: 30 },
    description: { type: String, required: true, trim: true, maxlength: 500 },

    website: { type: String, default: '', trim: true, maxlength: 200 },
    discord: { type: String, default: '', trim: true, maxlength: 200 },
    banner: { type: String, default: '', trim: true, maxlength: 500 },

    status: { type: String, enum: ['PENDING_REVIEW', 'APPROVED', 'REJECTED'], default: 'PENDING_REVIEW', index: true },
    rejectionReason: { type: String, default: '', trim: true, maxlength: 300 },
    submissionNote: { type: String, default: '', trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

PartnerAdSchema.index({ status: 1, createdAt: -1 });
PartnerAdSchema.index({ userId: 1 }, { unique: true });

const PartnerAd = models.PartnerAd || mongoose.model<IPartnerAd>('PartnerAd', PartnerAdSchema);

export default PartnerAd;
