import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { connectToDatabase } from "@/lib/db";
import { toPlainObject } from "@/lib/utils";
import {
  InquiryModel,
  ProductModel,
  SellExchangeRequestModel,
  UserModel,
} from "@/models";

export async function getDashboardStats() {
  await connectToDatabase();

  const [
    products,
    activeProducts,
    secondHandProducts,
    upcomingProducts,
    lowStock,
    inquiries,
    openInquiries,
    exchanges,
    pendingExchanges,
    users,
    recentInquiries,
    recentExchangeRequests,
  ] = await Promise.all([
      ProductModel.countDocuments(),
      ProductModel.countDocuments({ isActive: true }),
      ProductModel.countDocuments({ isActive: true, condition: "second-hand" }),
      ProductModel.countDocuments({ isActive: true, upcoming: true }),
      ProductModel.find({ isActive: true, stock: { $lte: LOW_STOCK_THRESHOLD } })
        .populate("brand", "name slug")
        .sort({ stock: 1, updatedAt: -1 })
        .limit(8)
        .lean(),
      InquiryModel.countDocuments(),
      InquiryModel.countDocuments({ status: { $in: ["new", "contacted"] } }),
      SellExchangeRequestModel.countDocuments(),
      SellExchangeRequestModel.countDocuments({ status: { $in: ["new", "reviewing"] } }),
      UserModel.countDocuments(),
      InquiryModel.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      SellExchangeRequestModel.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

  return {
    counts: {
      products,
      activeProducts,
      secondHandProducts,
      upcomingProducts,
      lowStock: lowStock.length,
      inquiries,
      openInquiries,
      exchanges,
      pendingExchanges,
      users,
    },
    lowStock: toPlainObject(lowStock),
    recentInquiries: toPlainObject(recentInquiries),
    recentExchangeRequests: toPlainObject(recentExchangeRequests),
  };
}
