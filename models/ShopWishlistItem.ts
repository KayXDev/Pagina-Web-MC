import mongoose, { Schema, models } from 'mongoose';

export interface IShopWishlistItem {
  _id: string;
  userId: string;
  productId: string;
  alertOnRestock: boolean;
  alertOnPriceDrop: boolean;
  lastKnownPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

const ShopWishlistItemSchema = new Schema<IShopWishlistItem>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    productId: {
      type: String,
      required: true,
      index: true,
    },
    alertOnRestock: {
      type: Boolean,
      default: true,
    },
    alertOnPriceDrop: {
      type: Boolean,
      default: true,
    },
    lastKnownPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

ShopWishlistItemSchema.index({ userId: 1, productId: 1 }, { unique: true });
ShopWishlistItemSchema.index({ productId: 1, updatedAt: -1 });

const ShopWishlistItem = models.ShopWishlistItem || mongoose.model<IShopWishlistItem>('ShopWishlistItem', ShopWishlistItemSchema);

export default ShopWishlistItem;