import mongoose, { Schema, models } from 'mongoose';

export interface INewsletterSubscriber {
  _id: string;
  email: string;
  subscribedAt: Date;
  unsubscribedAt?: Date | null;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NewsletterSubscriberSchema = new Schema<INewsletterSubscriber>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    subscribedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    unsubscribedAt: {
      type: Date,
      default: null,
    },
    source: {
      type: String,
      default: 'footer',
    },
  },
  {
    timestamps: true,
  }
);

const NewsletterSubscriber =
  models.NewsletterSubscriber || mongoose.model<INewsletterSubscriber>('NewsletterSubscriber', NewsletterSubscriberSchema);

export default NewsletterSubscriber;
