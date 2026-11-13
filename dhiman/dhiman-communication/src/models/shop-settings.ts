import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

const heroBannerSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "", trim: true },
    imageUrl: { type: String, default: "", trim: true },
    ctaLabel: { type: String, default: "", trim: true },
    ctaHref: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const socialLinkSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const shopSettingsSchema = new Schema(
  {
    key: {
      type: String,
      default: "primary",
      unique: true,
      index: true,
    },
    shopName: {
      type: String,
      required: true,
      trim: true,
    },
    logoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    heroBanners: {
      type: [heroBannerSchema],
      default: [],
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    mapLink: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    openingHours: {
      type: String,
      default: "",
      trim: true,
    },
    socialLinks: {
      type: [socialLinkSchema],
      default: [],
    },
    announcementBar: {
      type: String,
      default: "",
      trim: true,
    },
    themePreferences: {
      accentColor: { type: String, default: "#5eead4" },
      highlightColor: { type: String, default: "#f59e0b" },
    },
  },
  {
    timestamps: true,
  },
);

export type ShopSettingsRecord = InferSchemaType<typeof shopSettingsSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ShopSettingsModel =
  models.ShopSettings || model("ShopSettings", shopSettingsSchema);
