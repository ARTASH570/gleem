import { SkeletonStatCards, SkeletonCard } from "@/app/(dashboard)/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
      <SkeletonStatCards count={4} />
      <div className="mb-6">
        <SkeletonCard lines={4} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard lines={5} />
        <SkeletonCard lines={5} />
      </div>
    </div>
  );
}
