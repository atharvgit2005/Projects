import { LogoutButton } from "@/components/auth/logout-button";
import { Badge, ButtonLink, Panel, SectionHeading, StatCard } from "@/components/shared/ui";
import { getDashboardStats } from "@/services/dashboard-service";
import { formatDate } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Dashboard"
        title="Store overview"
        description="See what needs attention today, then jump straight into catalog updates, follow-ups, and inventory work."
        action={<LogoutButton />}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total products" value={stats.counts.products} hint={`${stats.counts.activeProducts} active now`} />
        <StatCard label="Low stock alerts" value={stats.counts.lowStock} hint="Products at or below reorder threshold" />
        <StatCard label="Open inquiries" value={stats.counts.openInquiries} hint={`${stats.counts.inquiries} total inquiry records`} />
        <StatCard label="Pending exchanges" value={stats.counts.pendingExchanges} hint={`${stats.counts.exchanges} total exchange requests`} />
        <StatCard label="Second-hand inventory" value={stats.counts.secondHandProducts} hint="Used devices currently listed" />
        <StatCard label="Upcoming products" value={stats.counts.upcomingProducts} hint="Launches and coming soon items" />
      </div>
      <Panel className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-white">Quick actions</h2>
            <p className="mt-1 text-sm text-slate-400">The most common owner tasks, one click away.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={stats.counts.lowStock > 0 ? "warning" : "default"}>
              {stats.counts.lowStock > 0 ? `${stats.counts.lowStock} low stock` : "Stock healthy"}
            </Badge>
            <Badge variant={stats.counts.openInquiries > 0 ? "warning" : "default"}>
              {stats.counts.openInquiries > 0 ? `${stats.counts.openInquiries} follow-ups` : "Inquiries under control"}
            </Badge>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ButtonLink href="/admin/products/new">Add product</ButtonLink>
          <ButtonLink href="/admin/products?view=low-stock" variant="secondary">Update stock</ButtonLink>
          <ButtonLink href="/admin/orders-or-inquiries?status=new" variant="secondary">Open inquiries</ButtonLink>
          <ButtonLink href="/admin/exchange-requests?status=new" variant="secondary">New exchange requests</ButtonLink>
        </div>
      </Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold text-white">Low stock alerts</h2>
            <ButtonLink href="/admin/products?view=low-stock" size="sm" variant="ghost">Open stock view</ButtonLink>
          </div>
          <div className="mt-4 space-y-3">
            {stats.lowStock.length ? (
              stats.lowStock.map((product: any) => (
                <div key={String(product._id)} className="rounded-xl border border-white/8 bg-white/4 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{product.title}</p>
                      <p className="text-sm text-slate-500">{product.brand?.name}</p>
                    </div>
                    <span className="text-sm text-amber-300">{product.stock} left</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No low stock warnings right now.</p>
            )}
          </div>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold text-white">Recent inquiries</h2>
            <ButtonLink href="/admin/orders-or-inquiries" size="sm" variant="ghost">View all</ButtonLink>
          </div>
          <div className="mt-4 space-y-3">
            {stats.recentInquiries.map((inquiry: any) => (
              <div key={String(inquiry._id)} className="rounded-xl border border-white/8 bg-white/4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{inquiry.customerName}</p>
                  <span className="text-xs text-slate-500">{formatDate(inquiry.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{inquiry.message || "Order request received."}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Panel>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-white">Recent sell / exchange requests</h2>
          <ButtonLink href="/admin/exchange-requests" size="sm" variant="ghost">View all</ButtonLink>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {stats.recentExchangeRequests.length ? (
            stats.recentExchangeRequests.map((request: any) => (
              <div key={String(request._id)} className="rounded-xl border border-white/8 bg-white/4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{request.customerName}</p>
                    <p className="text-sm text-slate-400">{request.brand} {request.model}</p>
                  </div>
                  <Badge variant={request.status === "new" ? "warning" : request.status === "reviewing" ? "default" : "success"}>
                    {request.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">{formatDate(request.createdAt)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No exchange requests yet.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}
