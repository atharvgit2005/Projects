import { Container, SkeletonCard } from "@/components/shared/ui";

export default function Loading() {
  return (
    <Container className="space-y-6 py-12">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={`stat-${index}`} className="h-28" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} className="h-80" />
        ))}
      </div>
    </Container>
  );
}
