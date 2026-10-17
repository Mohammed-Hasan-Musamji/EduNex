"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { learnerIdSchema, type LearnerIdInput } from "@/lib/schemas";
import { learnerApi } from "@/lib/api-client";
import { storeLearner } from "@/lib/learner-storage";
import { useLearner } from "@/hooks/use-learner";
import { routes } from "@/lib/routes";

export default function LoginPage() {
  const router = useRouter();
  const { learner, refresh } = useLearner();
  const [manualError, setManualError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LearnerIdInput>({ resolver: zodResolver(learnerIdSchema) });

  const continueAsCurrent = () => {
    router.push(routes.learner.dashboard);
  };

  const onSubmit = async (values: LearnerIdInput) => {
    setManualError(null);
    const result = await learnerApi.get(values.learnerId);
    if (!result.ok) {
      setManualError(result.error.kind === "not_found" ? "No profile exists with that ID." : result.error.message);
      return;
    }
    storeLearner(result.data.id, result.data.displayName);
    await refresh();
    router.push(routes.learner.dashboard);
  };

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-text">Continue learning</h1>
      <p className="mt-1 text-sm text-text-muted">Resume your learner profile on this device.</p>

      <div className="mt-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning-bg p-3 text-sm text-warning">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>EduNex has no password-based sign-in yet. There is nothing secret to enter here.</p>
      </div>

      {learner ? (
        <div className="mt-6 rounded-md border border-border bg-white p-4">
          <p className="text-sm text-text">
            Continue as <span className="font-medium">{learner.displayName}</span>?
          </p>
          <Button onClick={continueAsCurrent} className="mt-3 w-full">
            Continue
          </Button>
        </div>
      ) : (
        <p className="mt-6 text-sm text-text-muted">No profile is active on this device yet.</p>
      )}

      <div className="mt-6 border-t border-border pt-6">
        <p className="text-sm font-medium text-text">Resume a different profile</p>
        <p className="mt-1 text-xs text-text-muted">Paste a learner ID from another device or session.</p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-3 flex flex-col gap-3">
          <Input
            label="Learner ID"
            placeholder="00000000-0000-0000-0000-000000000000"
            error={errors.learnerId?.message ?? manualError ?? undefined}
            {...register("learnerId")}
          />
          <Button type="submit" variant="secondary" isLoading={isSubmitting}>
            Resume profile
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-text-muted">
        Need a new profile?{" "}
        <Link href={routes.register} className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
