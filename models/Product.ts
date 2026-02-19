import mongoose, { Schema, models } from 'mongoose';

export interface IProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: 'RANK' | 'BUNDLES' | 'CURRENCY' | 'KEYS' | 'SPECIAL';
  image?: string;
  features: string[];
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
