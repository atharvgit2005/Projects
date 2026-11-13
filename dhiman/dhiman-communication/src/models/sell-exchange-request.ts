import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { EXCHANGE_STATUSES } from "@/lib/constants";

const sellExchangeRequestSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      default: "",
    },
    deviceType: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    conditionDescription: {
      type: String,
      required: true,
      trim: true,
    },
    expectedPrice: {
      type: Number,
      default: null,
      min: 0,
    },
    exchangeForProduct: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: EXCHANGE_STATUSES,
      default: "new",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export type SellExchangeRequestRecord = InferSchemaType<typeof sellExchangeRequestSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const SellExchangeRequestModel =
  models.SellExchangeRequest || model("SellExchangeRequest", sellExchangeRequestSchema);
