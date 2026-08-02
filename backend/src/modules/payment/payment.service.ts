// Hiçbir yerde input.cardNumber, input.cvv veya input.expiry console'a, log'a veya hata
// mesajına YAZILMAZ. Hata fırlatırken bile bu alanlara referans verilmez — Payment
// modelinde zaten bu alanlar için bir yer yoktur, yalnızca cardLast4 ve cardBrand tutulur.
import mongoose from "mongoose";

import { Order, type OrderDocument } from "@/modules/order/order.model";
import type { OrderStatus } from "@/modules/order/order.types";
import { charge } from "@/modules/payment/fakePay.provider";
import { Payment, type PaymentDocument } from "@/modules/payment/payment.model";
import type { PayCardInput } from "@/modules/payment/payment.schemas";
import type { PaymentFailureReason, PaymentStatus } from "@/modules/payment/payment.types";
import { AppError } from "@/shared/AppError";
import { errorCodes } from "@/shared/errorCodes";
import { httpStatus } from "@/shared/httpStatus";

// Yalnızca bu iki durumdaki bir sipariş ödemeye uygundur: PENDING_PAYMENT hiç ödenmemiş,
// PAYMENT_FAILED önceki denemesi başarısız olmuş demektir. Diğer tüm durumlar (PAID,
// CANCELLED, SHIPPED, DELIVERED) ödeme akışı için kapalıdır.
const PAYABLE_ORDER_STATUSES: readonly OrderStatus[] = ["PENDING_PAYMENT", "PAYMENT_FAILED"];

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;
}

export interface PaymentView {
  _id: string;
  orderId: string;
  userId: string;
  amount: number;
  status: PaymentStatus;
  cardLast4: string;
  cardBrand: string;
  failureReason?: PaymentFailureReason;
  transactionId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Payment modelinde zaten kart numarası/CVV/son kullanma tarihi için bir alan yok; bu
// mapper sadece Mongoose belgesini düz bir görünüme çevirir, hassas veri filtrelemez
// çünkü filtrelenecek hassas veri hiç saklanmamıştır.
function toPaymentView(payment: PaymentDocument): PaymentView {
  return {
    _id: payment._id.toString(),
    orderId: payment.orderId.toString(),
    userId: payment.userId.toString(),
    amount: payment.amount,
    status: payment.status,
    cardLast4: payment.cardLast4,
    cardBrand: payment.cardBrand,
    failureReason: payment.failureReason,
    transactionId: payment.transactionId,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

export interface PayOrderResult {
  payment: PaymentView;
  order: {
    _id: string;
    orderNumber: string;
    status: OrderStatus;
    totalPrice: number;
  };
}

function buildResult(payment: PaymentDocument, order: OrderDocument): PayOrderResult {
  return {
    payment: toPaymentView(payment),
    order: {
      _id: order._id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      totalPrice: order.totalPrice,
    },
  };
}

// idempotencyKey ile eşleşen bir ödeme varsa çağıran taraf sonucu bu fonksiyondan alır;
// YENİ BİR ÖDEME ÇALIŞTIRILMAZ. Bulunamazsa null döner, çağıran taraf normal akışa devam eder.
async function loadIdempotentResult(userId: string, idempotencyKey: string): Promise<PayOrderResult | null> {
  const existing = await Payment.findOne({ idempotencyKey });
  if (!existing) {
    return null;
  }

  if (existing.userId.toString() !== userId) {
    throw AppError.forbidden("You do not have permission to access this payment");
  }

  const order = await Order.findById(existing.orderId);
  if (!order) {
    throw AppError.internal("Order referenced by existing payment not found");
  }

  return buildResult(existing, order);
}

async function recordChargeResult(
  userId: string,
  order: OrderDocument,
  amount: number,
  chargeResult: Awaited<ReturnType<typeof charge>>,
  idempotencyKey: string | undefined,
): Promise<PayOrderResult> {
  const session = await mongoose.startSession();
  try {
    let paymentDoc: PaymentDocument | undefined;
    let finalStatus: OrderStatus = order.status;

    await session.withTransaction(async () => {
      if (chargeResult.status === "SUCCEEDED") {
        const updateResult = await Order.updateOne(
          { _id: order._id, status: { $in: PAYABLE_ORDER_STATUSES } },
          { $set: { status: "PAID", paidAt: new Date() } },
          { session },
        );

        if (updateResult.modifiedCount === 0) {
          // Başka bir eşzamanlı istek aynı siparişi bu arada ödemiş demektir; bu isteğin
          // sonucu geçersizdir, transaction geri alınır.
          throw new AppError("Order has already been paid", httpStatus.CONFLICT, errorCodes.INVALID_STATE_TRANSITION);
        }

        finalStatus = "PAID";

        const created = await Payment.create(
          [
            {
              orderId: order._id,
              userId,
              amount,
              status: "SUCCEEDED",
              cardLast4: chargeResult.cardLast4,
              cardBrand: chargeResult.cardBrand,
              transactionId: chargeResult.transactionId,
              idempotencyKey,
            },
          ],
          { session },
        );
        paymentDoc = created[0];
        return;
      }

      // BAŞARISIZ ödemede stok GERİ VERİLMEZ: rezervasyon korunur ki müşteri aynı
      // siparişle ödemeyi tekrar deneyebilsin. Stoğu burada serbest bırakmak, müşteri
      // tekrar denerken aynı ürünün başkası tarafından satın alınmış olma riskini
      // doğurur. Müşteri vazgeçerse siparişi iptal eder (cancelOrder, Faz 6) — stok
      // yalnızca o akışta serbest bırakılır.
      await Order.updateOne(
        { _id: order._id, status: { $in: PAYABLE_ORDER_STATUSES } },
        { $set: { status: "PAYMENT_FAILED" } },
        { session },
      );
      finalStatus = "PAYMENT_FAILED";

      const created = await Payment.create(
        [
          {
            orderId: order._id,
            userId,
            amount,
            status: "FAILED",
            cardLast4: chargeResult.cardLast4,
            cardBrand: chargeResult.cardBrand,
            failureReason: chargeResult.failureReason,
            transactionId: chargeResult.transactionId,
            idempotencyKey,
          },
        ],
        { session },
      );
      paymentDoc = created[0];
    });

    if (!paymentDoc) {
      throw AppError.internal("Payment transaction completed without producing a payment record");
    }

    return {
      payment: toPaymentView(paymentDoc),
      order: {
        _id: order._id.toString(),
        orderNumber: order.orderNumber,
        status: finalStatus,
        totalPrice: order.totalPrice,
      },
    };
  } finally {
    await session.endSession();
  }
}

export async function payOrder(userId: string, input: PayCardInput, idempotencyKey?: string): Promise<PayOrderResult> {
  if (idempotencyKey) {
    const existingResult = await loadIdempotentResult(userId, idempotencyKey);
    if (existingResult) {
      return existingResult;
    }
  }

  const order = await Order.findById(input.orderId);
  if (!order) {
    throw AppError.notFound("Order");
  }

  if (order.userId.toString() !== userId) {
    throw AppError.forbidden("You do not have permission to pay for this order");
  }

  if (order.status === "PAID") {
    throw new AppError("Order has already been paid", httpStatus.CONFLICT, errorCodes.INVALID_STATE_TRANSITION);
  }

  if (!PAYABLE_ORDER_STATUSES.includes(order.status)) {
    throw new AppError(
      `Order cannot be paid while in status ${order.status}`,
      httpStatus.CONFLICT,
      errorCodes.INVALID_STATE_TRANSITION,
    );
  }

  // Tutar SİPARİŞTEN okunur, istemciden alınmaz — payCardSchema zaten bir amount alanı
  // kabul etmiyor, bu satır o kararın uygulanmasıdır.
  const amount = order.totalPrice;

  // charge() dış servis çağrısıdır ve TRANSACTION DIŞINDA yapılır: transaction boyunca
  // tutulan kilit, dış servis yavaşsa veya takılırsa veritabanı kaynaklarını gereksiz
  // yere tüketir. Ayrıca withTransaction geçici hatalarda (örn. write conflict) callback'i
  // BAŞTAN yeniden çalıştırabilir; charge() transaction içinde olsaydı kart iki kez
  // çekilebilirdi. Dış servis çağrısı bu yüzden transaction'ın DIŞINA, sonucu ise
  // transaction'ın İÇİNE (atomik durum güncellemesi için) konur.
  const chargeResult = await charge({
    cardNumber: input.cardNumber,
    cardHolder: input.cardHolder,
    expiry: input.expiry,
    cvv: input.cvv,
    amount,
  });

  try {
    return await recordChargeResult(userId, order, amount, chargeResult, idempotencyKey);
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    if (idempotencyKey) {
      const existingResult = await loadIdempotentResult(userId, idempotencyKey);
      if (existingResult) {
        return existingResult;
      }
    }

    // idempotencyKey'den gelmiyorsa çakışma orderId'nin kısmi unique index'inden
    // gelmiştir: bu siparişin zaten BAŞARILI bir ödemesi var.
    throw AppError.conflict("Order has already been paid");
  }
}

export async function getOrderPayments(userId: string, orderId: string): Promise<PaymentView[]> {
  const order = await Order.findById(orderId);
  if (!order) {
    throw AppError.notFound("Order");
  }

  if (order.userId.toString() !== userId) {
    throw AppError.forbidden("You do not have permission to access this order");
  }

  // Müşteri "kaç kez denedim, neden başarısız oldu" görebilsin diye o siparişe ait TÜM
  // ödeme denemeleri (başarılı + başarısız) en yeniden en eskiye döner.
  const payments = await Payment.find({ orderId }).sort({ createdAt: -1 });

  return payments.map(toPaymentView);
}
