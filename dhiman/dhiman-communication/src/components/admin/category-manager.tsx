"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client";
import { Button, CheckboxField, Panel, SelectField, TextField } from "@/components/shared/ui";

export function CategoryManager({ initialCategories }: { initialCategories: any[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "mobiles",
    imageUrl: "",
    sortOrder: 0,
    isActive: true,
  });
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setEditing(null);
    setForm({ name: "", slug: "", type: "mobiles", imageUrl: "", sortOrder: 0, isActive: true });
  };

  const sync = async () => {
    const response = await apiFetch<{ categories: any[] }>("/api/categories?all=true");
    setCategories(response.categories);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        await apiFetch(editing ? `/api/categories/${editing._id}` : "/api/categories", {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(form),
        });
        toast.success(editing ? "Category updated" : "Category created");
        await sync();
        reset();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save category");
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      try {
        await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
        toast.success("Category deleted");
        await sync();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to delete category");
      }
    });
  };

  const filteredCategories = categories.filter((category) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    return (
      category.name?.toLowerCase().includes(normalizedQuery) ||
      category.slug?.toLowerCase().includes(normalizedQuery) ||
      category.type?.toLowerCase().includes(normalizedQuery)
    );
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <Panel>
        <h2 className="font-display text-2xl font-semibold text-white">
          {editing ? "Edit category" : "Create category"}
        </h2>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <SelectField label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {["mobiles", "headphones", "earbuds", "cables", "chargers", "accessories", "second-hand"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectField>
          <TextField label="Image URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          <TextField
            label="Sort order"
            type="number"
            value={String(form.sortOrder)}
            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
          />
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
          <h2 className="font-display text-2xl font-semibold text-white">Existing categories</h2>
          <span className="text-sm text-slate-500">{categories.length} total</span>
        </div>
        <div className="mt-4">
          <TextField
            label="Search categories"
            placeholder="Name, slug, type..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="mt-5 space-y-3">
          {filteredCategories.map((category) => (
            <div key={String(category._id)} className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{category.name}</p>
                  <p className="text-sm text-slate-400">{category.slug} • {category.type}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditing(category);
                      setForm({
                        name: category.name,
                        slug: category.slug,
                        type: category.type,
                        imageUrl: category.imageUrl || "",
                        sortOrder: category.sortOrder || 0,
                        isActive: category.isActive,
                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => remove(category._id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!filteredCategories.length ? (
            <p className="text-sm text-slate-500">No categories match this search.</p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
