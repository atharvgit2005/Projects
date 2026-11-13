import { ExchangeRequestManager } from "@/components/admin/request-manager";
import { SectionHeading } from "@/components/shared/ui";
import { getSellExchangeRequests } from "@/services/commerce-service";

export default async function AdminExchangeRequestsPage() {
  const requests = await getSellExchangeRequests();

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Requests"
        title="Sell and exchange requests"
        description="Track incoming valuation requests, review condition notes, and move devices through approval or completion."
      />
      <ExchangeRequestManager initialItems={requests} />
    </div>
  );
}
