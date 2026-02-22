import mongoose, { Schema, models } from 'mongoose';

export interface IShopCartItem {
  productId: string;
  quantity: number;
}

export interface IShopCart {
  _id: string;
  userId: string;
  items: IShopCartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const ShopCartSchema = new Schema<IShopCart>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    items: [
      {
        productId: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1, max: 99 },
      },
    ],
  },
  { timestamps: true }
);

const ShopCart = models.ShopCart || mongoose.model<IShopCart>('ShopCart', ShopCartSchema);

export default ShopCart;
