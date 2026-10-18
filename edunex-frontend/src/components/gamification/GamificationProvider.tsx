"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { learningApi, notificationsApi } from "@/lib/api-client";
import { useLearner } from "@/hooks/use-learner";
import type { GamificationSummary, RewardSummary } from "@/types/engagement";
import { Celebration } from "./Celebration";

interface GamificationContextValue {
  /** null while loading or if it couldn't be loaded -- never a placeholder. */
  summary: GamificationSummary | null;
  unreadNotifications: number;
  refresh: () => Promise<void>;
  /** Show what a server-verified action earned, then refresh shared state. */
  celebrate: (rewards: RewardSummary | null, context: { title: string; message?: string }) => void;
}

const GamificationContext = createContext<GamificationContextValue | null>(null);

/** For components rendered both inside and outside the learner area (e.g. the topbar). */
export function useOptionalGamification() {
  return useContext(GamificationContext);
}

export function useGamification() {
  const value = useContext(GamificationContext);
  if (!value) throw new Error("useGamification must be used within a GamificationProvider");
  return value;
}

interface PendingCelebration {
  id: number;
  rewards: RewardSummary;
  title: string;
  message?: string;
}

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { learner } = useLearner();
  const [summary, setSummary] = useState<GamificationSummary | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [celebration, setCelebration] = useState<PendingCelebration | null>(null);

  const learnerId = learner?.id;

  const refresh = useCallback(async () => {
    if (!learnerId) return;
    const [summaryResult, notificationResult] = await Promise.all([
      learningApi.gamification(learnerId),
      notificationsApi.list({ unreadOnly: true, limit: 1 }),
    ]);
    if (summaryResult.ok) setSummary(summaryResult.data);
    if (notificationResult.ok) setUnreadNotifications(notificationResult.data.unreadCount);
  }, [learnerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const celebrate = useCallback(
    (rewards: RewardSummary | null, context: { title: string; message?: string }) => {
      void refresh();
      // Nothing new was earned (e.g. a replayed request): no celebration.
      if (!rewards || (rewards.xpAwarded === 0 && rewards.newAchievements.length === 0 && rewards.notes.length === 0)) return;
      setCelebration({ id: Date.now(), rewards, ...context });
    },
    [refresh],
  );

  const dismiss = useCallback(() => setCelebration(null), []);

  return (
    <GamificationContext.Provider value={{ summary, unreadNotifications, refresh, celebrate }}>
      {children}
      {celebration && (
        <Celebration
          key={celebration.id}
          rewards={celebration.rewards}
          title={celebration.title}
          message={celebration.message}
          onDismiss={dismiss}
        />
      )}
    </GamificationContext.Provider>
  );
}
