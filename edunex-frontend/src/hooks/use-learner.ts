import { useContext } from "react";
import { LearnerContext } from "@/components/learner/LearnerProvider";

export function useLearner() {
  const context = useContext(LearnerContext);
  if (!context) {
    throw new Error("useLearner must be used within a LearnerProvider");
  }
  return context;
}
