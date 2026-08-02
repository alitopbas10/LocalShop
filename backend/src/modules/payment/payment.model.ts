// Kart verisi hiçbir koşulda saklanmaz: cardNumber, cvv, expiry, cardHolder gibi alanlar
// bu şemada KESİNLİKLE bulunmaz. Yalnızca gösterim ve marka tespiti için gerekli olan
// son 4 hane (cardLast4) ve kart markası (cardBrand) tutulur.
import { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

import { PAYMENT_STATUSES, PAYMENT_FAILURE_REASONS, type PaymentStatus, type PaymentFailureReason } from "@/modules/payment/payment.types";

export interface IPayment {
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  // Siparişten okunur, istemciden ALINMAZ.
  amount: number;
  status: PaymentStatus;
  cardLast4: string;
  cardBrand: string;
  failureReason?: PaymentFailureReason;
  idempotencyKey?: string;
  // FakePay'in ürettiği referans, örn. "FP-xxxxxxxxxxxx"
  transactionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentModel = Model<IPayment>;

export type PaymentDocument = HydratedDocument<IPayment>;

const paymentSchema = new Schema<IPayment, PaymentModel>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      required: true,
    },
    cardLast4: {
      type: String,
      required: true,
      match: /^\d{4}$/,
    },
    cardBrand: {
      type: String,
      required: true,
    },
    failureReason: {
      type: String,
      enum: PAYMENT_FAILURE_REASONS,
    },
    idempotencyKey: {
      type: String,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
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

paymentSchema.index({ orderId: 1, createdAt: -1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

// Bir siparişin en fazla BİR başarılı ödemesi olabilir; başarısız denemeler sınırsızdır.
// Bunu uygulama katmanında kontrol etmek yetmez: iki eşzamanlı istek ikisi de "henüz
// ödenmemiş" görebilir, ikisi de başarılı ödeme kaydı oluşturabilir. Kısmi unique index
// bunu veritabanı seviyesinde imkansızlaştırır — yalnızca status: "SUCCEEDED" olan
// belgeler unique kısıtına dahildir.
paymentSchema.index(
  { orderId: 1 },
  { unique: true, partialFilterExpression: { status: "SUCCEEDED" } },
);

paymentSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const Payment = model<IPayment, PaymentModel>("Payment", paymentSchema);
