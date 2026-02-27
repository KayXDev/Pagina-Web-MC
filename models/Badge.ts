import mongoose, { Schema, models } from 'mongoose';

export interface IBadge {
  _id: string;
  slug: string; // badge id stored in user.badges
  labelEs: string;
  labelEn: string;
  icon: string; // URL or /public path
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BadgeSchema = new Schema<IBadge>(
  {
    slug: {
      type: String,
      required: [true, 'slug is required'],
      unique: true,
      trim: true,
      minlength: [2, 'slug too short'],
      maxlength: [40, 'slug too long'],
    },
    labelEs: {
      type: String,
      default: '',
      trim: true,
      maxlength: [60, 'labelEs too long'],
    },
    labelEn: {
      type: String,
      default: '',
      trim: true,
      maxlength: [60, 'labelEn too long'],
    },
    icon: {
      type: String,
      default: '',
      trim: true,
      maxlength: [300, 'icon too long'],
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default models.Badge || mongoose.model<IBadge>('Badge', BadgeSchema);
