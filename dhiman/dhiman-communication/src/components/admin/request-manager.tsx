"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client";
import { Badge, Panel, TextField } from "@/components/shared/ui";
import { formatDate } from "@/lib/utils";

const inquiryStatuses = ["all", "new", "contacted", "converted", "closed"] as const;
const exchangeStatuses = ["all", "new", "reviewing", "approved", "rejected", "completed"] as const;

function statusBadge(status: string) {
  if (status === "new") return "warning";
  if (status === "reviewing" || status === "contacted") return "default";
  if (status === "closed" || status === "completed" || status === "converted" || status === "approved") {
    return "success";
  }
  if (status === "rejected") return "danger";
  return "default";
}

export function InquiryManager({ initialItems }: { initialItems: any[] }) {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status");
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof inquiryStatuses)[number]>(
    inquiryStatuses.includes((initialStatus as (typeof inquiryStatuses)[number]) || "all")
      ? ((initialStatus as (typeof inquiryStatuses)[number]) || "all")
      : "all",
  );
  const [isPending, startTransition] = useTransition();

  const filteredItems = items.filter((item) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      item.customerName?.toLowerCase().includes(normalizedQuery) ||
      item.customerPhone?.toLowerCase().includes(normalizedQuery) ||
      item.customerEmail?.toLowerCase().includes(normalizedQuery) ||
      item.message?.toLowerCase().includes(normalizedQuery) ||
      item.items?.some((entry: any) => entry.title?.toLowerCase().includes(normalizedQuery));

    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const counts = {
    all: items.length,
    new: items.filter((item) => item.status === "new").length,
    contacted: items.filter((item) => item.status === "contacted").length,
    converted: items.filter((item) => item.status === "converted").length,
    closed: items.filter((item) => item.status === "closed").length,
  };

  const updateStatus = (id: string, status: string) => {
    startTransition(async () => {
      try {
        const response = await apiFetch<{ inquiry: any }>(`/api/inquiries/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        setItems((current) => current.map((item) => (item._id === id ? response.inquiry : item)));
        toast.success("Inquiry updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update inquiry");
      }
    });
  };

  return (
    <div className="space-y-5">
      <Panel className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-semibold text-white">Inquiry queue</h2>
          <p className="text-sm text-slate-400">Filter by status, search by customer or product, and update follow-up without leaving the page.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <TextField
            label="Search inquiries"
            placeholder="Customer, phone, email, product..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="flex flex-wrap items-end gap-2">
            {inquiryStatuses.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={
                  statusFilter === status
                    ? "rounded-xl border border-cyan-300 bg-cyan-300 px-3 py-2 text-sm font-medium text-slate-950"
                    : "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
                }
              >
                {status} ({counts[status]})
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/4 text-slate-400">
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Items</th>
                <th className="px-5 py-4">Message</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={String(item._id)} className="border-b border-white/6 text-slate-200">
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{item.customerName}</p>
                    <p className="text-xs text-slate-500">{item.customerPhone}</p>
                    {item.customerEmail ? <p className="text-xs text-slate-500">{item.customerEmail}</p> : null}
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {item.items?.length ? item.items.map((entry: any) => entry.title).join(", ") : "General inquiry"}
                  </td>
                  <td className="px-5 py-4 text-slate-300">{item.message || "-"}</td>
                  <td className="px-5 py-4">{formatDate(item.createdAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={statusBadge(item.status) as any}>{item.status}</Badge>
                      <select
                        className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        defaultValue={item.status}
                        onChange={(event) => updateStatus(item._id, event.target.value)}
                        disabled={isPending}
                      >
                        {inquiryStatuses.filter((status) => status !== "all").map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredItems.length ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              No inquiries match this view.
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

export function ExchangeRequestManager({ initialItems }: { initialItems: any[] }) {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status");
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof exchangeStatuses)[number]>(
    exchangeStatuses.includes((initialStatus as (typeof exchangeStatuses)[number]) || "all")
      ? ((initialStatus as (typeof exchangeStatuses)[number]) || "all")
      : "all",
  );
  const [isPending, startTransition] = useTransition();

  const filteredItems = items.filter((item) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      item.customerName?.toLowerCase().includes(normalizedQuery) ||
      item.customerPhone?.toLowerCase().includes(normalizedQuery) ||
      item.customerEmail?.toLowerCase().includes(normalizedQuery) ||
      item.brand?.toLowerCase().includes(normalizedQuery) ||
      item.model?.toLowerCase().includes(normalizedQuery) ||
      item.deviceType?.toLowerCase().includes(normalizedQuery);

    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const counts = {
    all: items.length,
    new: items.filter((item) => item.status === "new").length,
    reviewing: items.filter((item) => item.status === "reviewing").length,
    approved: items.filter((item) => item.status === "approved").length,
    rejected: items.filter((item) => item.status === "rejected").length,
    completed: items.filter((item) => item.status === "completed").length,
  };

  const updateStatus = (id: string, status: string) => {
    startTransition(async () => {
      try {
        const response = await apiFetch<{ request: any }>(`/api/sell-exchange/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        setItems((current) => current.map((item) => (item._id === id ? response.request : item)));
        toast.success("Exchange request updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update request");
      }
    });
  };

  return (
    <div className="space-y-5">
      <Panel className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-semibold text-white">Sell / exchange queue</h2>
          <p className="text-sm text-slate-400">Focus on new and reviewing requests first, then move devices through valuation and completion.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <TextField
            label="Search requests"
            placeholder="Customer, phone, brand, model..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="flex flex-wrap items-end gap-2">
            {exchangeStatuses.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={
                  statusFilter === status
                    ? "rounded-xl border border-cyan-300 bg-cyan-300 px-3 py-2 text-sm font-medium text-slate-950"
                    : "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
                }
              >
                {status} ({counts[status]})
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/4 text-slate-400">
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Device</th>
                <th className="px-5 py-4">Expected price</th>
                <th className="px-5 py-4">Condition notes</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={String(item._id)} className="border-b border-white/6 text-slate-200">
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{item.customerName}</p>
                    <p className="text-xs text-slate-500">{item.customerPhone}</p>
                    {item.customerEmail ? <p className="text-xs text-slate-500">{item.customerEmail}</p> : null}
                  </td>
                  <td className="px-5 py-4">
                    <p>{item.brand} {item.model}</p>
                    <p className="text-xs text-slate-500">{item.deviceType}</p>
                    {item.exchangeForProduct?.title ? (
                      <p className="mt-1 text-xs text-cyan-200">Interested in: {item.exchangeForProduct.title}</p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4">{item.expectedPrice ? `Rs. ${item.expectedPrice}` : "-"}</td>
                  <td className="px-5 py-4 text-slate-300">{item.conditionDescription}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={statusBadge(item.status) as any}>{item.status}</Badge>
                      <select
                        className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white"
                        defaultValue={item.status}
                        onChange={(event) => updateStatus(item._id, event.target.value)}
                        disabled={isPending}
                      >
                        {exchangeStatuses.filter((status) => status !== "all").map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredItems.length ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              No exchange requests match this view.
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
