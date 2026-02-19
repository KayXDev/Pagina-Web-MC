import mongoose, { Schema, models } from 'mongoose';

export interface IForumReply {
  _id: string;
  postId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const ForumReplySchema = new Schema<IForumReply>(
  {
    postId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

ForumReplySchema.index({ postId: 1, createdAt: 1 });

const ForumReply = models.ForumReply || mongoose.model<IForumReply>('ForumReply', ForumReplySchema);

export default ForumReply;
