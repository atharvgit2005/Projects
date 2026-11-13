import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

const wishlistSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    productIds: {
      type: [Schema.Types.ObjectId],
      ref: "Product",
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export type WishlistRecord = InferSchemaType<typeof wishlistSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const WishlistModel = models.Wishlist || model("Wishlist", wishlistSchema);
