import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { INQUIRY_STATUSES } from "@/lib/constants";

const inquiryItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      default: "",
    },
    thumbnail: {
      type: String,
      trim: true,
      default: "",
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const inquirySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    items: {
      type: [inquiryItemSchema],
      default: [],
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
    message: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: INQUIRY_STATUSES,
      default: "new",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export type InquiryRecord = InferSchemaType<typeof inquirySchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const InquiryModel = models.Inquiry || model("Inquiry", inquirySchema);
