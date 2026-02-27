import mongoose, { Schema, models } from 'mongoose';

export interface IUser {
  _id: string;
  username: string;
  displayName?: string;
  email: string;
  password: string;
  role: 'USER' | 'STAFF' | 'ADMIN' | 'OWNER';
  tags: string[];
  badges?: string[];
  balance?: number;
  followersCountOverride?: number | null;
  followingCountOverride?: number | null;
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
  usernameLastChangedAt?: Date;

  presenceStatus?: 'ONLINE' | 'BUSY' | 'INVISIBLE';
  lastSeenAt?: Date;

  emailVerifiedAt?: Date | null;
  emailVerificationTokenHash?: string;
  emailVerificationExpiresAt?: Date;
  emailVerificationRequestedAt?: Date;

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
    displayName: {
      type: String,
      default: '',
      trim: true,
      maxlength: [40, 'Display name cannot exceed 40 characters'],
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
    badges: {
      type: [String],
      default: [],
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    followersCountOverride: {
      type: Number,
      default: null,
      min: 0,
    },
    followingCountOverride: {
      type: Number,
      default: null,
      min: 0,
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

    presenceStatus: {
      type: String,
      enum: ['ONLINE', 'BUSY', 'INVISIBLE'],
      default: 'ONLINE',
    },
    lastSeenAt: {
      type: Date,
    },

    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    emailVerificationTokenHash: {
      type: String,
      default: '',
    },
    emailVerificationExpiresAt: {
      type: Date,
    },
    emailVerificationRequestedAt: {
      type: Date,
    },

    usernameLastChangedAt: {
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

    if (!models.User.schema.path('badges')) {
      models.User.schema.add({
        badges: {
          type: [String],
          default: [],
        },
      });
    }

    if (!models.User.schema.path('balance')) {
      models.User.schema.add({
        balance: {
          type: Number,
          default: 0,
          min: 0,
        },
      });
    }

    if (!models.User.schema.path('followersCountOverride')) {
      models.User.schema.add({
        followersCountOverride: {
          type: Number,
          default: null,
          min: 0,
        },
      });
    }

    if (!models.User.schema.path('followingCountOverride')) {
      models.User.schema.add({
        followingCountOverride: {
          type: Number,
          default: null,
          min: 0,
        },
      });
    }

    if (!models.User.schema.path('presenceStatus')) {
      models.User.schema.add({
        presenceStatus: {
          type: String,
          enum: ['ONLINE', 'BUSY', 'INVISIBLE'],
          default: 'ONLINE',
        },
      });
    }

    if (!models.User.schema.path('lastSeenAt')) {
      models.User.schema.add({
        lastSeenAt: {
          type: Date,
        },
      });
    }

    if (!models.User.schema.path('emailVerifiedAt')) {
      models.User.schema.add({
        emailVerifiedAt: {
          type: Date,
          default: null,
        },
      });
    }

    if (!models.User.schema.path('emailVerificationTokenHash')) {
      models.User.schema.add({
        emailVerificationTokenHash: {
          type: String,
          default: '',
        },
      });
    }

    if (!models.User.schema.path('emailVerificationExpiresAt')) {
      models.User.schema.add({
        emailVerificationExpiresAt: {
          type: Date,
        },
      });
    }

    if (!models.User.schema.path('emailVerificationRequestedAt')) {
      models.User.schema.add({
        emailVerificationRequestedAt: {
          type: Date,
        },
      });
    }

    if (!models.User.schema.path('displayName')) {
      models.User.schema.add({
        displayName: {
          type: String,
          default: '',
          trim: true,
          maxlength: [40, 'Display name cannot exceed 40 characters'],
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

    if (!models.User.schema.path('usernameLastChangedAt')) {
      models.User.schema.add({
        usernameLastChangedAt: {
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
