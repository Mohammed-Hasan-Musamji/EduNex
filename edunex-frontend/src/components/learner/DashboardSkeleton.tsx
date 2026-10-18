"use client";

import { cn } from "@/lib/utils";

export function DashboardSkeleton() {
  return (
    <div className="animate-in fade-in duration-300 space-y-6" aria-busy="true" aria-label="Loading dashboard content">
      {/* Top Greeting & Actions Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="skeleton-shimmer h-9 w-64 rounded-xl" />
          <div className="skeleton-shimmer h-4 w-80 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <div className="skeleton-shimmer h-10 w-36 rounded-xl" />
          <div className="skeleton-shimmer h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* Hero Stats Pill Bar Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-shimmer h-14 rounded-2xl" />
        ))}
      </div>

      {/* Top 3 Learning Feed Cards Skeleton */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Card 1 */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="skeleton-shimmer size-10 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <div className="skeleton-shimmer h-4 w-28 rounded-md" />
              <div className="skeleton-shimmer h-3 w-44 rounded-md" />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="skeleton-shimmer h-6 w-36 rounded-lg" />
            <div className="skeleton-shimmer h-4 w-full rounded-md" />
            <div className="skeleton-shimmer h-4 w-4/5 rounded-md" />
          </div>
          <div className="pt-2">
            <div className="flex justify-between pb-1">
              <div className="skeleton-shimmer h-3 w-24 rounded-md" />
              <div className="skeleton-shimmer h-3 w-10 rounded-md" />
            </div>
            <div className="skeleton-shimmer h-2.5 w-full rounded-full" />
          </div>
          <div className="skeleton-shimmer h-9 w-36 rounded-xl pt-2" />
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="skeleton-shimmer size-10 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <div className="skeleton-shimmer h-4 w-32 rounded-md" />
              <div className="skeleton-shimmer h-3 w-40 rounded-md" />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <div className="rounded-xl border border-border/50 p-3 space-y-2">
              <div className="skeleton-shimmer h-4 w-28 rounded-md" />
              <div className="skeleton-shimmer h-3 w-full rounded-md" />
            </div>
            <div className="rounded-xl border border-border/50 p-3 space-y-2">
              <div className="skeleton-shimmer h-4 w-32 rounded-md" />
              <div className="skeleton-shimmer h-3 w-5/6 rounded-md" />
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="skeleton-shimmer size-10 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <div className="skeleton-shimmer h-4 w-30 rounded-md" />
              <div className="skeleton-shimmer h-3 w-36 rounded-md" />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-start justify-between gap-3 rounded-xl border border-border/50 p-3">
                <div className="space-y-1.5 flex-1">
                  <div className="skeleton-shimmer h-4 w-32 rounded-md" />
                  <div className="skeleton-shimmer h-3 w-44 rounded-md" />
                </div>
                <div className="skeleton-shimmer size-5 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom 2 Cards Skeleton */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="skeleton-shimmer h-5 w-36 rounded-lg" />
            <div className="skeleton-shimmer h-5 w-20 rounded-full" />
          </div>
          <div className="space-y-4 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="skeleton-shimmer h-4 w-28 rounded-md" />
                  <div className="skeleton-shimmer h-4 w-12 rounded-md" />
                </div>
                <div className="skeleton-shimmer h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
          <div className="skeleton-shimmer h-4 w-32 rounded-md pt-2" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="skeleton-shimmer h-5 w-32 rounded-lg" />
            <div className="skeleton-shimmer h-5 w-20 rounded-full" />
          </div>
          <div className="skeleton-shimmer h-3 w-3/4 rounded-md" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start justify-between gap-3">
                <div className="skeleton-shimmer h-4 w-52 rounded-md" />
                <div className="skeleton-shimmer h-3 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
