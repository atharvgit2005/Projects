import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { CATEGORY_TYPES } from "@/lib/constants";

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: CATEGORY_TYPES,
      default: "mobiles",
      index: true,
    },
    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export type CategoryRecord = InferSchemaType<typeof categorySchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const CategoryModel = models.Category || model("Category", categorySchema);
