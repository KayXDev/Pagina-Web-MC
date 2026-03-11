import mongoose, { Schema, models } from 'mongoose';

export interface IProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  compareAtPrice?: number;
  saleStartsAt?: Date;
  saleEndsAt?: Date;
  offerLabel?: string;
  bonusBalanceAmount?: number;
  category: 'RANK' | 'BUNDLES' | 'CURRENCY' | 'KEYS' | 'SPECIAL';
  image?: string;
  features: string[];
  deliveryCommands?: string[];
  isActive: boolean;
  stock?: number;
  isUnlimited: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    salePrice: {
      type: Number,
      min: 0,
    },
    compareAtPrice: {
      type: Number,
      min: 0,
    },
    saleStartsAt: {
      type: Date,
    },
    saleEndsAt: {
      type: Date,
      index: true,
    },
    offerLabel: {
      type: String,
      default: '',
      trim: true,
      maxlength: 60,
    },
    bonusBalanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    category: {
      type: String,
      enum: ['RANK', 'BUNDLES', 'CURRENCY', 'KEYS', 'SPECIAL'],
      required: true,
    },
    image: {
      type: String,
      default: '',
    },
    features: [
      {
        type: String,
      },
    ],
    deliveryCommands: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    stock: {
      type: Number,
      min: 0,
    },
    isUnlimited: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Product = models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
