import mongoose, { Schema, models } from 'mongoose';

export interface IVoteEvent {
  _id: string;
  userId: string;
  username: string;
  site: string;
  createdAt: Date;
  updatedAt: Date;
}

const VoteEventSchema = new Schema<IVoteEvent>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    site: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

VoteEventSchema.index({ userId: 1, site: 1, createdAt: -1 });
VoteEventSchema.index({ createdAt: -1 });

const VoteEvent = models.VoteEvent || mongoose.model<IVoteEvent>('VoteEvent', VoteEventSchema);

export default VoteEvent;
