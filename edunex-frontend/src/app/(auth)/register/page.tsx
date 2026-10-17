"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createProfileSchema, type CreateProfileInput } from "@/lib/schemas";
import { useLearner } from "@/hooks/use-learner";
import { useToast } from "@/hooks/use-toast";
import { routes } from "@/lib/routes";

export default function RegisterPage() {
  const router = useRouter();
  const { learner, createLearner } = useLearner();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateProfileInput>({ resolver: zodResolver(createProfileSchema) });

  const onSubmit = async (values: CreateProfileInput) => {
    const result = await createLearner(values.displayName);
    if (!result.ok) {
      setError("displayName", { message: result.message });
      return;
    }
    showToast({ variant: "success", title: "Profile created", description: `Welcome to EduNex, ${values.displayName}!` });
    router.push(routes.learner.dashboard);
  };

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-text">Create your learner profile</h1>
      <p className="mt-1 text-sm text-text-muted">Start turning learning gaps into personalized growth.</p>

      <div className="mt-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning-bg p-3 text-sm text-warning">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          EduNex doesn&apos;t have password accounts yet. This creates a real learner profile on the backend,
          identified by a device-local ID stored in this browser — not a secured login.
        </p>
      </div>

      {learner && (
        <p className="mt-3 text-xs text-text-muted">
          You already have a profile on this device ({learner.displayName}). Creating a new one will replace it here.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-4">
        <Input
          label="Display name"
          autoComplete="name"
          placeholder="e.g. Ada"
          error={errors.displayName?.message}
          {...register("displayName")}
        />
        <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
          Create profile
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        Already have a profile?{" "}
        <Link href={routes.login} className="font-medium text-primary hover:underline">
          Continue
        </Link>
      </p>
    </div>
  );
}
