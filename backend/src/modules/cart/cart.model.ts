// Sepet sadece "hangi ürün, kaç adet" bilgisini taşır; price, name gibi ürün alanları
// asla burada tutulmaz. Fiyat her okumada üründen canlı çekilir — aksi halde satıcı
// fiyatı değiştirdiğinde sepet eski fiyatı göstermeye devam eder.
import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

export interface ICartItem {
  productId: Types.ObjectId;
  quantity: number;
}

export interface ICart {
  userId: Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export type CartModel = Model<ICart>;

export type CartDocument = HydratedDocument<ICart>;

const MAX_DISTINCT_PRODUCTS = 50;

const cartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 99,
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be an integer",
      },
    },
  },
  { _id: false },
);

const cartSchema = new Schema<ICart, CartModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
      validate: {
        validator: (items: ICartItem[]) => items.length <= MAX_DISTINCT_PRODUCTS,
        message: "Cart cannot contain more than 50 distinct products",
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

export const Cart = model<ICart, CartModel>("Cart", cartSchema);
