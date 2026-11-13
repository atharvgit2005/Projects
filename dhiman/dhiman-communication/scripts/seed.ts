import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  const [{ env }, { connectToDatabase }, seedData, authService, models] = await Promise.all([
    import("@/lib/env"),
    import("@/lib/db"),
    import("@/lib/seed-data"),
    import("@/services/auth-service"),
    import("@/models"),
  ]);

  const { seedBrands, seedCategories, seedProducts, seedSettings } = seedData;
  const { bootstrapOwner } = authService;
  const { BrandModel, CategoryModel, ProductModel, ShopSettingsModel } = models;

  await connectToDatabase();

  const categoryMap = new Map<string, string>();
  const brandMap = new Map<string, string>();

  for (const category of seedCategories) {
    const created = await CategoryModel.findOneAndUpdate(
      { slug: category.slug },
      category,
      { returnDocument: "after", upsert: true },
    );
    categoryMap.set(category.slug, created._id.toString());
  }

  for (const brand of seedBrands) {
    const created = await BrandModel.findOneAndUpdate(
      { slug: brand.slug },
      brand,
      { returnDocument: "after", upsert: true },
    );
    brandMap.set(brand.slug, created._id.toString());
  }

  for (const product of seedProducts) {
    const brandId = brandMap.get(product.brandSlug);
    const categoryId = categoryMap.get(product.categorySlug);

    if (!brandId || !categoryId) {
      throw new Error(`Missing brand or category for ${product.title}`);
    }

    await ProductModel.findOneAndUpdate(
      { sku: product.sku },
      {
        title: product.title,
        slug: product.slug,
        description: product.description,
        shortDescription: product.shortDescription,
        brand: brandId,
        category: categoryId,
        condition: product.condition,
        price: product.price,
        originalPrice: product.originalPrice,
        discountPercent: product.discountPercent,
        stock: product.stock,
        sku: product.sku,
        images: product.images,
        thumbnail: product.thumbnail,
        featured: product.featured,
        latestRelease: product.latestRelease,
        upcoming: product.upcoming,
        upcomingReleaseDate: product.upcomingReleaseDate,
        youtubeReviewLinks: product.youtubeReviewLinks,
        specs: product.specs,
        filterMeta: {
          brand: seedBrands.find((brand) => brand.slug === product.brandSlug)?.name || "",
          series: product.specs.series,
          ram: product.specs.ram,
          storage: product.specs.storage,
          processor: product.specs.processor,
        },
        tags: product.tags,
        isActive: product.isActive,
      },
      { returnDocument: "after", upsert: true },
    );
  }

  await ShopSettingsModel.findOneAndUpdate(
    { key: "primary" },
    { ...seedSettings, key: "primary" },
    { returnDocument: "after", upsert: true },
  );

  if (env.ownerEmail && env.ownerBootstrapCode && env.ownerPassword) {
    await bootstrapOwner({
      name: "Primary Owner",
      email: env.ownerEmail,
      password: env.ownerPassword,
      phone: env.shopPhone,
      bootstrapCode: env.ownerBootstrapCode,
    });
  }

  console.log("Database seeded successfully");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
