"use client";

import { useEffect, useRef, useState } from "react";
import { Award, Bell, CheckCheck, ClipboardList, Flame, Star, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { notificationsApi } from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/formatters";
import { buildDiagnosticUrl, routes } from "@/lib/routes";
import { useGamification } from "@/components/gamification/GamificationProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/types/engagement";

const typeIcon: Record<NotificationType, LucideIcon> = {
  achievement_earned: Award,
  level_up: TrendingUp,
  streak_milestone: Flame,
  diagnostic_results: ClipboardList,
  concept_mastered: Star,
};

function hrefFor(n: AppNotification): string {
  if (n.resourceType === "diagnostic" && n.resourceId) return buildDiagnosticUrl(n.resourceId);
  return routes.learner.progress;
}

/** In-app notifications only -- these are server-stored records, not browser push. */
export function NotificationBell() {
  const { unreadNotifications, refresh } = useGamification();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void notificationsApi.list({ limit: 20 }).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setItems(res.data.items);
        setError(null);
      } else {
        setError(res.error.message);
      }
    });
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openNotification = async (n: AppNotification) => {
    if (!n.isRead) {
      await notificationsApi.markRead(n.id);
      void refresh();
    }
    setOpen(false);
    router.push(hrefFor(n));
  };

  const markAll = async () => {
    const res = await notificationsApi.markAllRead();
    if (res.ok) {
      setItems((current) => (current ?? []).map((n) => ({ ...n, isRead: true })));
      void refresh();
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : "Notifications"}
        className="relative flex size-10 items-center justify-center rounded-[var(--radius-md)] text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unreadNotifications > 0 && (
          <span className="absolute right-1.5 top-1.5 flex min-w-4 animate-pop items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-white ring-2 ring-card">
            {unreadNotifications > 9 ? "9+" : unreadNotifications}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-3 top-[4.5rem] z-40 animate-scale-in rounded-[var(--radius-lg)] border border-border bg-card shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-serif text-sm font-semibold text-text">Notifications</p>
            {items && items.some((n) => !n.isRead) && (
              <button type="button" onClick={() => void markAll()} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <CheckCheck className="size-3.5" aria-hidden="true" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {error ? (
              <p className="px-4 py-6 text-sm text-error">{error}</p>
            ) : items === null ? (
              <div className="flex flex-col gap-2 p-4">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium text-text">You&apos;re all caught up</p>
                <p className="mt-1 text-xs text-text-muted">Achievements, level-ups, and diagnostic results will appear here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => {
                  const Icon = typeIcon[n.type];
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => void openNotification(n)}
                        className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-ivory", !n.isRead && "bg-primary-soft/40")}
                      >
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-gold-soft text-secondary">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-text">{n.title}</span>
                          {n.body && <span className="mt-0.5 block text-xs text-text-muted">{n.body}</span>}
                          <span className="mt-1 block text-[11px] text-text-subtle">{formatRelativeTime(n.createdAt)}</span>
                        </span>
                        {!n.isRead && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
