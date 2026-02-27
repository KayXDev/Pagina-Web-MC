import mongoose, { Schema, models } from 'mongoose';

export interface IPendingUser {
  _id: string;
  username: string;
  displayName?: string;
  email: string;
  passwordHash: string;
  codeHash: string;
  expiresAt: Date;
  requestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PendingUserSchema = new Schema<IPendingUser>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    displayName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 40,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 320,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    requestedAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

PendingUserSchema.index({ email: 1 });
PendingUserSchema.index({ username: 1 });
PendingUserSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PendingUser = models.PendingUser || mongoose.model<IPendingUser>('PendingUser', PendingUserSchema);

export default PendingUser;
