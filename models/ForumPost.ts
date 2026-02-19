import mongoose, { Schema, models } from 'mongoose';

export type ForumCategory = 'GENERAL' | 'HELP' | 'REPORTS' | 'TRADES';

export interface IForumPost {
  _id: string;
  title: string;
  content: string;
  category: ForumCategory;
  authorId: string;
  authorUsername: string;
  rootId?: string | null;
  parentId?: string | null;
  repostOf?: string | null;
  repostCount?: number;
  media?: string[];
  repliesCount: number;
  views: number;
  likesCount: number;
  likedBy: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ForumPostSchema = new Schema<IForumPost>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 80,
    },
    content: {
      type: String,
      required: true,
      // Timeline style: allow short content; reposts can be empty.
      minlength: 0,
      maxlength: 280,
    },
    category: {
      type: String,
      enum: ['GENERAL', 'HELP', 'REPORTS', 'TRADES'],
      required: true,
      index: true,
    },
    authorId: {
      type: String,
      required: true,
      index: true,
    },
    authorUsername: {
      type: String,
      required: true,
    },
    rootId: {
      type: String,
      default: null,
      index: true,
    },
    parentId: {
      type: String,
      default: null,
      index: true,
    },
    repostOf: {
      type: String,
      default: null,
      index: true,
    },
    repostCount: {
      type: Number,
      default: 0,
    },
    media: {
      type: [String],
      default: [],
    },
    repliesCount: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    likedBy: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

ForumPostSchema.index({ createdAt: -1 });
ForumPostSchema.index({ rootId: 1, createdAt: 1 });
ForumPostSchema.index({ parentId: 1, createdAt: 1 });
ForumPostSchema.index({ repostOf: 1, createdAt: -1 });
ForumPostSchema.index({ authorId: 1, createdAt: -1 });

ForumPostSchema.path('content').validate(function (value: string) {
  const isRepost = Boolean((this as any).repostOf);
  if (isRepost) return typeof value === 'string' && value.length <= 280;
  return typeof value === 'string' && value.trim().length >= 1 && value.length <= 280;
}, 'Contenido inválido');

const ForumPost = models.ForumPost || mongoose.model<IForumPost>('ForumPost', ForumPostSchema);

export default ForumPost;
