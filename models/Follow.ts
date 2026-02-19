import mongoose, { Schema, models } from 'mongoose';

export interface IFollow {
  _id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  updatedAt: Date;
}

const FollowSchema = new Schema<IFollow>(
  {
    followerId: {
      type: String,
      required: true,
      index: true,
    },
    followingId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
FollowSchema.index({ followingId: 1, createdAt: -1 });

const Follow = models.Follow || mongoose.model<IFollow>('Follow', FollowSchema);

export default Follow;
