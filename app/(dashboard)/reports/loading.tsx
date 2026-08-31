import { SkeletonStatCards, SkeletonCard } from "@/app/(dashboard)/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="h-7 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
      <SkeletonStatCards count={3} />
      <SkeletonCard lines={6} />
    </div>
  );
}
