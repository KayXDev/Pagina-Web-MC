import mongoose, { Schema, models } from 'mongoose';

export interface IUser {
  _id: string;
  username: string;
  email: string;
  password: string;
  role: 'USER' | 'STAFF' | 'ADMIN' | 'OWNER';
  tags: string[];
  adminSections?: string[];
  adminSectionsConfigured?: boolean;
  avatar?: string;
  banner?: string;
  verified?: boolean;
  minecraftUsername?: string;
  minecraftUuid?: string;
  minecraftLinkedAt?: Date;
  isBanned: boolean;
  bannedReason?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;

  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  passwordResetRequestedAt?: Date;
  passwordResetUsedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    role: {
      type: String,
      enum: ['USER', 'STAFF', 'ADMIN', 'OWNER'],
      default: 'USER',
    },
    tags: {
      type: [String],
      default: [],
    },
    adminSections: {
      type: [String],
      default: [],
    },
    adminSectionsConfigured: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    banner: {
      type: String,
      default: '',
    },
    verified: {
      type: Boolean,
      default: false,
    },
    minecraftUsername: {
      type: String,
      default: '',
      trim: true,
    },
    minecraftUuid: {
      type: String,
      default: '',
      trim: true,
    },
    minecraftLinkedAt: {
      type: Date,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    bannedReason: {
      type: String,
      default: '',
    },
    lastLogin: {
      type: Date,
    },

    passwordResetTokenHash: {
      type: String,
      default: '',
    },
    passwordResetExpiresAt: {
      type: Date,
    },
    passwordResetRequestedAt: {
      type: Date,
    },
    passwordResetUsedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// En Next.js (dev/HMR) el modelo puede quedar cacheado con un schema antiguo.
// Aseguramos que el modelo existente soporte OWNER y tags.
if (models.User) {
  try {
    const rolePath: any = models.User.schema.path('role');
    if (rolePath?.enum) {
      rolePath.enum(['USER', 'STAFF', 'ADMIN', 'OWNER']);
    }

    if (!models.User.schema.path('tags')) {
      models.User.schema.add({
        tags: {
          type: [String],
          default: [],
        },
      });
    }

    if (!models.User.schema.path('adminSections')) {
      models.User.schema.add({
        adminSections: {
          type: [String],
          default: [],
        },
      });
    }

    if (!models.User.schema.path('adminSectionsConfigured')) {
      models.User.schema.add({
        adminSectionsConfigured: {
          type: Boolean,
          default: false,
        },
      });
    }

    if (!models.User.schema.path('banner')) {
      models.User.schema.add({
        banner: {
          type: String,
          default: '',
        },
      });
    }

    if (!models.User.schema.path('verified')) {
      models.User.schema.add({
        verified: {
          type: Boolean,
          default: false,
        },
      });
    }

    if (!models.User.schema.path('minecraftUsername')) {
      models.User.schema.add({
        minecraftUsername: {
          type: String,
          default: '',
          trim: true,
        },
      });
    }

    if (!models.User.schema.path('minecraftUuid')) {
      models.User.schema.add({
        minecraftUuid: {
          type: String,
          default: '',
          trim: true,
        },
      });
    }

    if (!models.User.schema.path('minecraftLinkedAt')) {
      models.User.schema.add({
        minecraftLinkedAt: {
          type: Date,
        },
      });
    }

    if (!models.User.schema.path('passwordResetTokenHash')) {
      models.User.schema.add({
        passwordResetTokenHash: {
          type: String,
          default: '',
        },
      });
    }

    if (!models.User.schema.path('passwordResetExpiresAt')) {
      models.User.schema.add({
        passwordResetExpiresAt: {
          type: Date,
        },
      });
    }

    if (!models.User.schema.path('passwordResetRequestedAt')) {
      models.User.schema.add({
        passwordResetRequestedAt: {
          type: Date,
        },
      });
    }

    if (!models.User.schema.path('passwordResetUsedAt')) {
      models.User.schema.add({
        passwordResetUsedAt: {
          type: Date,
        },
      });
    }
  } catch {
    // Si algo falla, seguimos con el modelo actual
  }
}

const User = models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
