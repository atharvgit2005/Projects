import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { PRODUCT_CONDITIONS } from "@/lib/constants";

const specsSchema = new Schema(
  {
    ram: { type: String, default: "" },
    storage: { type: String, default: "" },
    processor: { type: String, default: "" },
    battery: { type: String, default: "" },
    display: { type: String, default: "" },
    camera: { type: String, default: "" },
    operatingSystem: { type: String, default: "" },
    connectivity: { type: String, default: "" },
    colorOptions: { type: [String], default: [] },
    series: { type: String, default: "" },
  },
  { _id: false },
);

const filterMetaSchema = new Schema(
  {
    brand: { type: String, default: "" },
    series: { type: String, default: "" },
    ram: { type: String, default: "" },
    storage: { type: String, default: "" },
    processor: { type: String, default: "" },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    condition: {
      type: String,
      enum: PRODUCT_CONDITIONS,
      default: "new",
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    originalPrice: {
      type: Number,
      default: null,
      min: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    images: {
      type: [String],
      default: [],
    },
    thumbnail: {
      type: String,
      default: "",
      trim: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    latestRelease: {
      type: Boolean,
      default: false,
      index: true,
    },
    upcoming: {
      type: Boolean,
      default: false,
      index: true,
    },
    upcomingReleaseDate: {
      type: Date,
      default: null,
    },
    youtubeReviewLinks: {
      type: [String],
      default: [],
    },
    specs: {
      type: specsSchema,
      default: () => ({}),
    },
    filterMeta: {
      type: filterMetaSchema,
      default: () => ({}),
    },
    tags: {
      type: [String],
      default: [],
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

productSchema.index({
  title: "text",
  shortDescription: "text",
  description: "text",
  tags: "text",
  sku: "text",
});

export type ProductRecord = InferSchemaType<typeof productSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ProductModel = models.Product || model("Product", productSchema);
