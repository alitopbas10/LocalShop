import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

import { ORDER_STATUSES, FULFILLMENT_STATUSES, type OrderStatus, type FulfillmentStatus } from "@/modules/order/order.types";

export interface IOrderItem {
  productId: Types.ObjectId;
  sellerId: Types.ObjectId;
  // SNAPSHOT: sipariş anındaki ürün adı. Ürün sonradan yeniden adlandırılsa veya silinse
  // bile bu değer ASLA güncellenmez — sipariş geçmişi o anki gerçeği yansıtır.
  name: string;
  // SNAPSHOT: sipariş anındaki birim fiyat. Ürünün fiyatı sonradan değişse bile bu değer
  // ASLA güncellenmez — müşterinin ödediği fiyat sabit kalır.
  price: number;
  quantity: number;
  lineTotal: number;
  fulfillmentStatus: FulfillmentStatus;
}

export interface IOrder {
  orderNumber: string;
  userId: Types.ObjectId;
  items: IOrderItem[];
  totalPrice: number;
  status: OrderStatus;
  sellerIds: Types.ObjectId[];
  paidAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderModel = Model<IOrder>;

export type OrderDocument = HydratedDocument<IOrder>;

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be an integer",
      },
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    fulfillmentStatus: {
      type: String,
      enum: FULFILLMENT_STATUSES,
      default: "PENDING",
    },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder, OrderModel>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length >= 1,
        message: "Order must contain at least one item",
      },
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
      default: "PENDING_PAYMENT",
    },
    sellerIds: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    paidAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
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

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ sellerIds: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order = model<IOrder, OrderModel>("Order", orderSchema);
