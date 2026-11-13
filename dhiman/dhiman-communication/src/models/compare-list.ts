import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

const compareListSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true,
      index: true,
    },
    guestSessionId: {
      type: String,
      unique: true,
      sparse: true,
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

export type CompareListRecord = InferSchemaType<typeof compareListSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const CompareListModel =
  models.CompareList || model("CompareList", compareListSchema);
