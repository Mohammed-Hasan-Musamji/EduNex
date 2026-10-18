import {
  LayoutDashboard,
  Compass,
  Sparkles,
  ClipboardCheck,
  TrendingUp,
  Bookmark,
  BookOpenText,
  Users,
  BookOpen,
  Database,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { routes } from "@/lib/routes";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shorter label for the mobile bottom tab bar. */
  shortLabel?: string;
}

export const learnerNavItems: NavItem[] = [
  { label: "Dashboard", href: routes.learner.dashboard, icon: LayoutDashboard, shortLabel: "Home" },
  { label: "Explore Subjects", href: routes.learner.subjects, icon: Compass, shortLabel: "Explore" },
  { label: "Learn with AI", href: routes.learner.learn, icon: Sparkles, shortLabel: "Learn" },
  { label: "Ask the Textbook", href: routes.learner.tutor, icon: BookOpenText, shortLabel: "Ask" },
  { label: "Practice & Assessments", href: routes.learner.practice, icon: ClipboardCheck, shortLabel: "Practice" },
  { label: "My Progress", href: routes.learner.progress, icon: TrendingUp, shortLabel: "Progress" },
  { label: "Saved Lessons", href: routes.learner.savedLessons, icon: Bookmark },
];

export const adminNavItems: NavItem[] = [
  { label: "Admin Dashboard", href: routes.admin.dashboard, icon: LayoutDashboard },
  { label: "User Management", href: routes.admin.users, icon: Users },
  { label: "Subject & Course Management", href: routes.admin.courses, icon: BookOpen },
  { label: "Academic Content & Knowledge Base", href: routes.admin.knowledgeBase, icon: Database },
  { label: "Platform Analytics & Settings", href: routes.admin.analyticsSettings, icon: BarChart3 },
];

export type PanelVariant = "learner" | "admin";

/**
 * Looked up by variant name (a plain string) rather than passed as a prop
 * containing icon components — Next.js Server Components cannot pass
 * function values like Lucide icons as props into Client Components.
 */
export const navigationPanels: Record<PanelVariant, { label: string; items: NavItem[] }> = {
  learner: { label: "Learner", items: learnerNavItems },
  admin: { label: "Admin", items: adminNavItems },
};

/** The four destinations pinned to the learner's mobile tab bar (the rest live in the menu). */
export const learnerTabItems: NavItem[] = learnerNavItems.filter((item) =>
  [routes.learner.dashboard, routes.learner.learn, routes.learner.practice, routes.learner.progress].includes(item.href),
);
