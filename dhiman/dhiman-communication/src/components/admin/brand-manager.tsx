"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client";
import { Button, CheckboxField, Panel, TextField } from "@/components/shared/ui";

export function BrandManager({ initialBrands }: { initialBrands: any[] }) {
  const [brands, setBrands] = useState(initialBrands);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    logoUrl: "",
    isActive: true,
  });
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setEditing(null);
    setForm({ name: "", slug: "", logoUrl: "", isActive: true });
  };

  const sync = async () => {
    const response = await apiFetch<{ brands: any[] }>("/api/brands?all=true");
    setBrands(response.brands);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        await apiFetch(editing ? `/api/brands/${editing._id}` : "/api/brands", {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(form),
        });
        toast.success(editing ? "Brand updated" : "Brand created");
        await sync();
        reset();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save brand");
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      try {
        await apiFetch(`/api/brands/${id}`, { method: "DELETE" });
        toast.success("Brand deleted");
        await sync();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to delete brand");
      }
    });
  };

  const filteredBrands = brands.filter((brand) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    return brand.name?.toLowerCase().includes(normalizedQuery) || brand.slug?.toLowerCase().includes(normalizedQuery);
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <Panel>
        <h2 className="font-display text-2xl font-semibold text-white">
          {editing ? "Edit brand" : "Create brand"}
        </h2>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <TextField label="Logo URL" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
          <CheckboxField label="Active" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {editing ? "Save" : "Create"}
            </Button>
            {editing ? (
              <Button type="button" variant="ghost" onClick={reset}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-white">Existing brands</h2>
          <span className="text-sm text-slate-500">{brands.length} total</span>
        </div>
        <div className="mt-4">
          <TextField
            label="Search brands"
            placeholder="Brand name or slug..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="mt-5 space-y-3">
          {filteredBrands.map((brand) => (
            <div key={String(brand._id)} className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{brand.name}</p>
                  <p className="text-sm text-slate-400">{brand.slug}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditing(brand);
                      setForm({
                        name: brand.name,
                        slug: brand.slug,
                        logoUrl: brand.logoUrl || "",
                        isActive: brand.isActive,
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => remove(brand._id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!filteredBrands.length ? (
            <p className="text-sm text-slate-500">No brands match this search.</p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
