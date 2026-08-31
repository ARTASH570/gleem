import { SkeletonCard } from "@/app/(dashboard)/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-2xl">
      <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
      <SkeletonCard lines={7} />
    </div>
  );
}
