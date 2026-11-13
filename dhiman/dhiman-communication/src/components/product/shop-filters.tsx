import { Button, Panel, SelectField, TextField } from "@/components/shared/ui";
import { DiscountRangeFields } from "@/components/product/discount-range-fields";

export function ShopFilters({
  filters,
  categories,
  brands,
  options,
}: {
  filters: Record<string, string | undefined>;
  categories: Array<{ slug: string; name: string }>;
  brands: Array<{ slug: string; name: string }>;
  options: {
    series: string[];
    ram: string[];
    storage: string[];
    processor: string[];
    minPrice: number;
    maxPrice: number;
    maxDiscount: number;
  };
}) {
  return (
    <Panel className="surface-soft">
      <form action="/shop" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TextField label="Search" name="search" defaultValue={filters.search} placeholder="Phone, brand, processor..." />
        <SelectField label="Category" name="category" defaultValue={filters.category}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Brand" name="brand" defaultValue={filters.brand}>
          <option value="">All brands</option>
          {brands.map((brand) => (
            <option key={brand.slug} value={brand.slug}>
              {brand.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Condition" name="condition" defaultValue={filters.condition}>
          <option value="">New and second-hand</option>
          <option value="new">New</option>
          <option value="second-hand">Second-hand</option>
        </SelectField>
        <SelectField label="Series" name="series" defaultValue={filters.series}>
          <option value="">Any series</option>
          {options.series.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </SelectField>
        <SelectField label="RAM" name="ram" defaultValue={filters.ram}>
          <option value="">Any RAM</option>
          {options.ram.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </SelectField>
        <SelectField label="Storage" name="storage" defaultValue={filters.storage}>
          <option value="">Any storage</option>
          {options.storage.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </SelectField>
        <SelectField label="Processor" name="processor" defaultValue={filters.processor}>
          <option value="">Any processor</option>
          {options.processor.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </SelectField>
        <TextField label="Min price" type="number" name="minPrice" defaultValue={filters.minPrice} />
        <TextField label="Max price" type="number" name="maxPrice" defaultValue={filters.maxPrice} />
        <DiscountRangeFields
          key={`${options.maxDiscount}-${filters.minDiscount ?? "0"}-${filters.maxDiscount ?? String(options.maxDiscount)}`}
          minName="minDiscount"
          maxName="maxDiscount"
          maxValue={options.maxDiscount}
          defaultMin={filters.minDiscount}
          defaultMax={filters.maxDiscount}
          className="md:col-span-2 xl:col-span-2"
        />
        <SelectField label="Sort" name="sort" defaultValue={filters.sort}>
          <option value="newest">Newest</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="highest-discount">Highest discount</option>
          <option value="featured">Featured</option>
        </SelectField>
        <div className="flex flex-wrap items-end gap-3 border-t border-white/8 pt-2 xl:col-span-4">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="discounted" value="true" defaultChecked={filters.discounted === "true"} />
            Discounted only
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="featured" value="true" defaultChecked={filters.featured === "true"} />
            Featured only
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="upcoming" value="true" defaultChecked={filters.upcoming === "true"} />
            Upcoming only
          </label>
          <Button type="submit">Apply filters</Button>
        </div>
      </form>
    </Panel>
  );
}
