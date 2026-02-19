import mongoose, { Schema, models } from 'mongoose';

export type StaffApplicationStatus = 'NEW' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED';

export interface IStaffApplication {
  _id: string;
  userId?: string;
  ticketId?: string;
  username: string;
  discord: string;
  about: string;
  status: StaffApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const StaffApplicationSchema = new Schema<IStaffApplication>(
  {
    userId: {
      type: String,
      index: true,
    },
    ticketId: {
      type: String,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 32,
    },
    discord: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 64,
    },
    about: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['NEW', 'REVIEWED', 'ACCEPTED', 'REJECTED'],
      default: 'NEW',
      index: true,
    },
  },
  { timestamps: true }
);

StaffApplicationSchema.index({ createdAt: -1 });

const StaffApplication =
  models.StaffApplication ||
  mongoose.model<IStaffApplication>('StaffApplication', StaffApplicationSchema);

export default StaffApplication;
