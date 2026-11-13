import { InquiryManager } from "@/components/admin/request-manager";
import { SectionHeading } from "@/components/shared/ui";
import { getInquiries } from "@/services/commerce-service";

export default async function AdminInquiriesPage() {
  const inquiries = await getInquiries();

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Requests"
        title="Customer inquiries and order requests"
        description="Review new and contacted inquiries first, then move completed follow-ups out of the active queue."
      />
      <InquiryManager initialItems={inquiries} />
    </div>
  );
}
