// عناصر أساسية لشاشات التحميل (skeleton) - بتتعمل بيها كل loading.tsx
// في المشروع. مفيش أي منطق هنا، مجرد مربعات رمادية بتنبض (animate-pulse
// من Tailwind الأساسي، مفيش إضافات جديدة).

export function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-200 dark:bg-gray-700 rounded ${className}`} />;
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-3">
          <SkeletonBox className="h-3 w-20" />
          <SkeletonBox className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card animate-pulse">
      <SkeletonBox className="h-5 w-40 mb-5" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonBox key={c} className={`h-4 ${c === 0 ? "w-1/6" : "flex-1"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard({ lines = 4 }: { lines?: number }) {
  return (
    <div className="card animate-pulse space-y-3">
      <SkeletonBox className="h-5 w-32 mb-2" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}
