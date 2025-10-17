/**
 * SectionSkeleton - Loading placeholder
 *
 * Componente de skeleton para loading state das seções
 * Sprint 3: Lazy Loading + Suspense
 */

import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function SectionSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gray-200 rounded-t-lg py-3">
          <div className="h-5 bg-gray-300 rounded w-1/4"></div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function MultipleSectionSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="space-y-8">
      {Array.from({ length: count }).map((_, i) => (
        <SectionSkeleton key={i} />
      ))}
    </div>
  );
}
