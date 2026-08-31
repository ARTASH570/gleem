import { SkeletonTable } from "@/app/(dashboard)/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
      <SkeletonTable rows={5} cols={4} />
    </div>
  );
}
