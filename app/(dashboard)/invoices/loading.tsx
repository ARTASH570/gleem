import { SkeletonTable } from "@/app/(dashboard)/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="h-7 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <SkeletonTable rows={8} cols={5} />
    </div>
  );
}
