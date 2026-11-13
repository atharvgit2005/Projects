import { Types } from "mongoose";
import { MAX_COMPARE_ITEMS } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { HttpError } from "@/lib/http";
import {
  CartModel,
  CompareListModel,
  InquiryModel,
  ProductModel,
  SellExchangeRequestModel,
  WishlistModel,
  type CartRecord,
  type CompareListRecord,
  type InquiryRecord,
  type SellExchangeRequestRecord,
  type WishlistRecord,
} from "@/models";
import { toPlainObject } from "@/lib/utils";
import type { CartContext } from "@/types";

let commerceCollectionsNormalized: Promise<void> | null = null;

function getContextQuery(context: CartContext) {
  if (context.userId) {
    return { user: new Types.ObjectId(context.userId) };
  }

  if (context.guestSessionId) {
    return { guestSessionId: context.guestSessionId };
  }

  throw new HttpError(400, "Session context is required");
}

function toObjectId(id: string) {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(400, "Invalid object id");
  }

  return new Types.ObjectId(id);
}

async function ensureNormalizedCommerceCollections() {
  await connectToDatabase();

  if (!commerceCollectionsNormalized) {
    commerceCollectionsNormalized = Promise.all([
      CartModel.updateMany({ guestSessionId: "" }, { $unset: { guestSessionId: 1 } }),
      CartModel.updateMany({ user: null }, { $unset: { user: 1 } }),
      CompareListModel.updateMany({ guestSessionId: "" }, { $unset: { guestSessionId: 1 } }),
      CompareListModel.updateMany({ user: null }, { $unset: { user: 1 } }),
    ]).then(() => undefined);
  }

  await commerceCollectionsNormalized;
}

export async function getWishlist(userId: string) {
  await connectToDatabase();
  const wishlist = await WishlistModel.findOne({ user: new Types.ObjectId(userId) })
    .populate({
      path: "productIds",
      populate: [
        { path: "brand", select: "name slug logoUrl" },
        { path: "category", select: "name slug type" },
      ],
    })
    .lean<WishlistRecord | null>();

  return wishlist ? toPlainObject(wishlist) : { productIds: [] };
}

export async function toggleWishlistItem(userId: string, productId: string) {
  await connectToDatabase();
  const productObjectId = toObjectId(productId);
  const product = await ProductModel.findById(productObjectId).select("_id").lean();

  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  let wishlist = await WishlistModel.findOne({ user: new Types.ObjectId(userId) });

  if (!wishlist) {
    wishlist = await WishlistModel.create({
      user: new Types.ObjectId(userId),
      productIds: [productObjectId],
    });
  } else {
    const exists = wishlist.productIds.some((id: Types.ObjectId) => id.toString() === productId);
    wishlist.productIds = exists
      ? wishlist.productIds.filter((id: Types.ObjectId) => id.toString() !== productId)
      : [...wishlist.productIds, productObjectId];
    await wishlist.save();
  }

  return getWishlist(userId);
}

export async function getCompareList(context: CartContext) {
  await ensureNormalizedCommerceCollections();
  const compareList = await CompareListModel.findOne(getContextQuery(context))
    .populate({
      path: "productIds",
      populate: [
        { path: "brand", select: "name slug logoUrl" },
        { path: "category", select: "name slug type" },
      ],
    })
    .lean<CompareListRecord | null>();

  return compareList ? toPlainObject(compareList) : { productIds: [] };
}

export async function addToCompare(context: CartContext, productId: string) {
  await ensureNormalizedCommerceCollections();
  const productObjectId = toObjectId(productId);
  const query = getContextQuery(context);
  let compareList = await CompareListModel.findOne(query);

  if (!compareList) {
    compareList = await CompareListModel.create({
      ...query,
      productIds: [productObjectId],
    });
  } else if (!compareList.productIds.some((id: Types.ObjectId) => id.toString() === productId)) {
    if (compareList.productIds.length >= MAX_COMPARE_ITEMS) {
      throw new HttpError(400, `You can compare up to ${MAX_COMPARE_ITEMS} products`);
    }

    compareList.productIds.push(productObjectId);
    await compareList.save();
  }

  return getCompareList(context);
}

export async function removeFromCompare(context: CartContext, productId: string) {
  await ensureNormalizedCommerceCollections();
  const compareList = await CompareListModel.findOne(getContextQuery(context));

  if (compareList) {
    compareList.productIds = compareList.productIds.filter(
      (id: Types.ObjectId) => id.toString() !== productId,
    );
    await compareList.save();
  }

  return getCompareList(context);
}

export async function getCart(context: CartContext) {
  await ensureNormalizedCommerceCollections();
  const cart = await CartModel.findOne(getContextQuery(context))
    .populate({
      path: "items.product",
      populate: [
        { path: "brand", select: "name slug logoUrl" },
        { path: "category", select: "name slug type" },
      ],
    })
    .lean<CartRecord | null>();

  const plainCart = cart ? toPlainObject(cart) : { items: [] };
  const total = plainCart.items.reduce(
    (sum: number, item: { quantity: number; priceSnapshot: number }) =>
      sum + item.quantity * item.priceSnapshot,
    0,
  );

  return {
    ...plainCart,
    total,
  };
}

export async function addToCart(context: CartContext, productId: string, quantity: number) {
  await ensureNormalizedCommerceCollections();
  const query = getContextQuery(context);
  const productObjectId = toObjectId(productId);
  const product = await ProductModel.findById(productObjectId).lean();

  if (!product || !product.isActive) {
    throw new HttpError(404, "Product not found");
  }

  let cart = await CartModel.findOne(query);

  if (!cart) {
    cart = await CartModel.create({
      ...query,
      items: [{ product: productObjectId, quantity, priceSnapshot: product.price }],
    });
  } else {
    const existingItem = cart.items.find(
      (item: { product: Types.ObjectId }) => item.product.toString() === productId,
    );

    if (existingItem) {
      existingItem.quantity = Math.min(existingItem.quantity + quantity, 10);
      existingItem.priceSnapshot = product.price;
    } else {
      cart.items.push({
        product: productObjectId,
        quantity,
        priceSnapshot: product.price,
      });
    }

    await cart.save();
  }

  return getCart(context);
}

export async function updateCartItem(context: CartContext, productId: string, quantity: number) {
  await ensureNormalizedCommerceCollections();
  const cart = await CartModel.findOne(getContextQuery(context));

  if (!cart) {
    throw new HttpError(404, "Cart not found");
  }

  const item = cart.items.find(
    (entry: { product: Types.ObjectId }) => entry.product.toString() === productId,
  );

  if (!item) {
    throw new HttpError(404, "Cart item not found");
  }

  item.quantity = quantity;
  await cart.save();
  return getCart(context);
}

export async function removeFromCart(context: CartContext, productId: string) {
  await ensureNormalizedCommerceCollections();
  const cart = await CartModel.findOne(getContextQuery(context));

  if (cart) {
    cart.items = cart.items.filter(
      (item: { product: Types.ObjectId }) => item.product.toString() !== productId,
    );
    await cart.save();
  }

  return getCart(context);
}

export async function clearCart(context: CartContext) {
  await ensureNormalizedCommerceCollections();
  const cart = await CartModel.findOne(getContextQuery(context));

  if (cart) {
    cart.items = [];
    await cart.save();
  }

  return getCart(context);
}

export async function createInquiry(
  userId: string | undefined,
  input: {
    items: Array<{
      productId?: string;
      title: string;
      slug?: string;
      thumbnail?: string;
      quantity: number;
      price: number;
    }>;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    message?: string;
  },
) {
  await connectToDatabase();
  const inquiry = await InquiryModel.create({
    user: userId ? new Types.ObjectId(userId) : null,
    items: input.items.map((item: {
      productId?: string;
      title: string;
      slug?: string;
      thumbnail?: string;
      quantity: number;
      price: number;
    }) => ({
      product: item.productId && Types.ObjectId.isValid(item.productId) ? new Types.ObjectId(item.productId) : null,
      title: item.title,
      slug: item.slug ?? "",
      thumbnail: item.thumbnail ?? "",
      quantity: item.quantity,
      price: item.price,
    })),
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail ?? "",
    message: input.message ?? "",
  });

  return toPlainObject(inquiry.toObject());
}

export async function getInquiries(userId?: string) {
  await connectToDatabase();
  const inquiries = await InquiryModel.find(userId ? { user: new Types.ObjectId(userId) } : {})
    .sort({ createdAt: -1 })
    .lean<InquiryRecord[]>();

  return toPlainObject(inquiries);
}

export async function updateInquiryStatus(id: string, status: string) {
  await connectToDatabase();
  const inquiry = await InquiryModel.findByIdAndUpdate(id, { status }, { returnDocument: "after" }).lean();

  if (!inquiry) {
    throw new HttpError(404, "Inquiry not found");
  }

  return toPlainObject(inquiry);
}

export async function createSellExchangeRequest(
  userId: string | undefined,
  input: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    deviceType: string;
    brand: string;
    model: string;
    conditionDescription: string;
    expectedPrice?: number | null;
    exchangeForProduct?: string;
    images: string[];
  },
) {
  await connectToDatabase();

  const record = await SellExchangeRequestModel.create({
    user: userId ? new Types.ObjectId(userId) : null,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail ?? "",
    deviceType: input.deviceType,
    brand: input.brand,
    model: input.model,
    conditionDescription: input.conditionDescription,
    expectedPrice: input.expectedPrice ?? null,
    exchangeForProduct:
      input.exchangeForProduct && Types.ObjectId.isValid(input.exchangeForProduct)
        ? new Types.ObjectId(input.exchangeForProduct)
        : null,
    images: input.images,
  });

  return toPlainObject(record.toObject());
}

export async function getSellExchangeRequests(userId?: string) {
  await connectToDatabase();
  const requests = await SellExchangeRequestModel.find(
    userId ? { user: new Types.ObjectId(userId) } : {},
  )
    .populate("exchangeForProduct", "title slug thumbnail")
    .sort({ createdAt: -1 })
    .lean<SellExchangeRequestRecord[]>();

  return toPlainObject(requests);
}

export async function updateSellExchangeStatus(id: string, status: string) {
  await connectToDatabase();
  const request = await SellExchangeRequestModel.findByIdAndUpdate(
    id,
    { status },
    { returnDocument: "after" },
  )
    .populate("exchangeForProduct", "title slug thumbnail")
    .lean();

  if (!request) {
    throw new HttpError(404, "Exchange request not found");
  }

  return toPlainObject(request);
}
