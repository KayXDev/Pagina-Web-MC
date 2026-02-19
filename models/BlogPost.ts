import mongoose, { Schema, models } from 'mongoose';

export interface IBlogPost {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  image?: string;
  author: string;
  authorId: string;
  tags: string[];
  isPublished: boolean;
  publishedAt?: Date;
  views: number;
  likesCount: number;
  likedBy: string[];
  createdAt: Date;
  updatedAt: Date;
}

const BlogPostSchema = new Schema<IBlogPost>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    excerpt: {
      type: String,
      required: true,
      maxlength: 200,
    },
    image: {
      type: String,
      default: '',
    },
    author: {
      type: String,
      required: true,
    },
    authorId: {
      type: String,
      required: true,
    },
    tags: [
      {
        type: String,
      },
    ],
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
    },
    views: {
      type: Number,
      default: 0,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const BlogPost = models.BlogPost || mongoose.model<IBlogPost>('BlogPost', BlogPostSchema);

export default BlogPost;
