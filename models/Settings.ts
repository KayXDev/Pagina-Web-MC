import mongoose, { Schema, models } from 'mongoose';

export interface ISettings {
  _id: string;
  key: string;
  value: string;
  description?: string;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Settings = models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

export default Settings;
