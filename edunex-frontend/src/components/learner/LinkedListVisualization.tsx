"use client";

import { useState } from "react";
import {
  ArrowRight,
  RotateCcw,
  StepForward,
  Plus,
  Trash2,
  Sparkles,
  Sliders,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { playClickSound, playHoverTick, playSuccessChime } from "@/lib/audio-effects";
import { cn, generateId } from "@/lib/utils";

interface ListNode {
  id: string;
  value: string;
  nextAddr?: string;
}

const DEFAULT_VALUES = ["10", "20"];

const SIMULATION_STEPS = [
  {
    step: 1,
    title: "Allocate Node in Memory",
    explanation: "Step 1: Allocate a new node in memory with data = 42 and next pointer pointing to NULL.",
    newNodeNext: "null",
    headPointsTo: "node-1",
  },
  {
    step: 2,
    title: "Link New Node to Current Head",
    explanation: "Step 2: Point new_node->next to the current head node (address 0x2A). Existing nodes are preserved.",
    newNodeNext: "0x2A",
    headPointsTo: "node-1",
  },
  {
    step: 3,
    title: "Update Head Pointer",
    explanation: "Step 3: Reassign head reference to the newly inserted node (address 0x42). Insertion at head complete in O(1) time!",
    newNodeNext: "0x2A",
    headPointsTo: "new-node",
  },
];

interface LinkedListVisualizationProps {
  initialValues?: string[];
}

export function LinkedListVisualization({ initialValues }: LinkedListVisualizationProps) {
  const [mode, setMode] = useState<"simulation" | "sandbox">("simulation");
  const [simStep, setSimStep] = useState(0); // 0 = step 1, 1 = step 2, 2 = step 3

  // Sandbox mode state
  const [nodes, setNodes] = useState<ListNode[]>(() =>
    (initialValues && initialValues.length > 0 ? initialValues : DEFAULT_VALUES).map((value, i) => ({
      id: generateId("node"),
      value,
      nextAddr: i === 0 ? "0x2A" : "null",
    }))
  );
  const [newValue, setNewValue] = useState("");
  const [removeTargetId, setRemoveTargetId] = useState("");
  const [traversalIndex, setTraversalIndex] = useState<number | null>(null);

  const handleNextStep = () => {
    playClickSound();
    if (simStep < SIMULATION_STEPS.length - 1) {
      setSimStep((prev) => prev + 1);
    } else {
      playSuccessChime();
      setSimStep(0);
    }
  };

  const handleResetSim = () => {
    playClickSound();
    setSimStep(0);
  };

  const addNode = () => {
    const value = newValue.trim();
    if (!value) return;
    playClickSound();
    setNodes((current) => [
      ...current,
      { id: generateId("node"), value, nextAddr: "null" },
    ]);
    setNewValue("");
    setTraversalIndex(null);
  };

  const removeNode = () => {
    if (!removeTargetId) return;
    playClickSound();
    setNodes((current) => current.filter((node) => node.id !== removeTargetId));
    setRemoveTargetId("");
    setTraversalIndex(null);
  };

  const currentStepInfo = SIMULATION_STEPS[simStep];

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
      {/* Top Header matching Screenshot 1 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-card p-4 sm:p-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
            <Sparkles className="size-3" />
            <span>Interactive Whiteboard</span>
          </div>
          <h3 className="font-serif text-base sm:text-lg font-bold text-text">
            Singly Linked List: Visualizing Insertion at Head
          </h3>
        </div>

        {/* Action Controls & Mode Switcher */}
        <div className="flex items-center gap-2">
          {mode === "simulation" ? (
            <>
              <button
                type="button"
                onMouseEnter={playHoverTick}
                onClick={handleResetSim}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-text hover:bg-ivory active:scale-95 transition-all shadow-2xs"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onMouseEnter={playHoverTick}
                onClick={handleNextStep}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-white hover:bg-primary-hover active:scale-95 transition-all shadow-xs"
              >
                <span>{simStep === 2 ? "Start Over" : "Next Step"}</span>
                <StepForward className="size-3.5" />
              </button>
            </>
          ) : (
            <span className="text-xs text-text-muted">Custom Sandbox</span>
          )}

          {/* Toggle Mode */}
          <button
            type="button"
            onClick={() => setMode((m) => (m === "simulation" ? "sandbox" : "simulation"))}
            title={mode === "simulation" ? "Switch to Sandbox Mode" : "Switch to Guided Simulation"}
            className="flex items-center gap-1 rounded-xl border border-border bg-ivory px-2.5 py-1.5 text-xs font-medium text-text hover:bg-card transition-colors"
          >
            <Sliders className="size-3.5 text-text-muted" />
            <span className="hidden sm:inline">{mode === "simulation" ? "Sandbox" : "Guided"}</span>
          </button>
        </div>
      </div>

      {mode === "simulation" ? (
        /* Guided Step-by-Step Whiteboard Terminal (Matching Screenshot 1) */
        <div className="p-4 sm:p-6 bg-[#0e131f] text-slate-100">
          {/* Terminal Meta Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs tracking-wider pb-4 border-b border-slate-800">
            <span className="font-bold text-amber-400">
              OPERATION: Prepend node with value &apos;42&apos;
            </span>
            <span className="font-bold text-emerald-400">
              TIME COMPLEXITY: O(1)
            </span>
          </div>

          {/* Graphical Canvas with subtle dot grid */}
          <div className="relative py-8 sm:py-12 overflow-x-auto [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:20px_20px]">
            <div className="flex items-center gap-3 sm:gap-4 min-w-[500px] justify-center px-4">
              {/* Head Pointer Indicator */}
              <div className="flex flex-col items-center gap-1">
                <span className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                  HEAD
                </span>
                <span className="text-xs text-amber-400">&darr;</span>
              </div>

              {/* New Node (Allocated in step 1, prepend target) */}
              <div
                className={cn(
                  "relative flex items-center rounded-xl border-2 p-1 font-mono text-xs shadow-lg transition-all duration-500",
                  simStep === 0
                    ? "border-amber-400 bg-amber-500/20 ring-4 ring-amber-400/20 scale-105"
                    : "border-amber-500/80 bg-amber-500/10"
                )}
              >
                <div className="bg-amber-600/30 text-amber-200 px-3 py-2 rounded-lg font-bold">
                  data: 42
                </div>
                <div className="bg-slate-900/80 text-slate-400 px-2.5 py-2 rounded-lg ml-1 text-[11px]">
                  next: {currentStepInfo.newNodeNext}
                </div>

                <span className="absolute -top-3 left-2 bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded text-[9px] font-bold">
                  NEW NODE (0x42)
                </span>
              </div>

              {/* Arrow */}
              <div className="flex items-center text-amber-400 font-bold px-1">
                <ArrowRight className="size-5" />
              </div>

              {/* Node 1 */}
              <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900/90 p-1 font-mono text-xs shadow-md">
                <div className="bg-emerald-500/20 text-emerald-300 px-3 py-2 rounded-lg font-bold">
                  data: 10
                </div>
                <div className="bg-slate-800 text-slate-400 px-2.5 py-2 rounded-lg ml-1 text-[11px]">
                  next: 0x2A
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center text-slate-500 font-bold px-1">
                <ArrowRight className="size-5" />
              </div>

              {/* Node 2 */}
              <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900/90 p-1 font-mono text-xs shadow-md">
                <div className="bg-emerald-500/20 text-emerald-300 px-3 py-2 rounded-lg font-bold">
                  data: 20
                </div>
                <div className="bg-slate-800 text-slate-400 px-2.5 py-2 rounded-lg ml-1 text-[11px]">
                  next: null
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Explanation Callout Box matching Screenshot 1 */}
          <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 sm:p-4 text-xs sm:text-sm font-mono text-slate-300 flex items-center justify-between">
            <p className="leading-relaxed">{currentStepInfo.explanation}</p>
            <span className="shrink-0 ml-3 rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-amber-400">
              Step {simStep + 1} / 3
            </span>
          </div>
        </div>
      ) : (
        /* Sandbox Mode (Custom Node creation & traversal) */
        <div className="p-4 sm:p-5 bg-card">
          <div className="flex min-h-[96px] flex-wrap items-center gap-1 overflow-x-auto py-2">
            <span className="mr-1 rounded-full border border-border bg-ivory px-2.5 py-1 text-xs font-semibold text-text-muted">
              head
            </span>
            <ArrowRight className="size-4 shrink-0 text-text-muted" aria-hidden="true" />

            {nodes.map((node, index) => (
              <div key={node.id} className="flex shrink-0 items-center gap-1">
                <div
                  className={cn(
                    "flex min-w-16 flex-col items-center rounded-xl border px-3 py-2 text-center shadow-xs transition-all",
                    traversalIndex === index
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40 scale-105"
                      : "border-border bg-card"
                  )}
                >
                  <span className="text-sm font-bold text-text">{node.value}</span>
                  <span className="text-[10px] text-text-muted">addr: {node.nextAddr}</span>
                </div>
                <ArrowRight className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
              </div>
            ))}

            <span className="rounded-full border border-border bg-ivory px-2.5 py-1 text-xs font-semibold text-text-muted">
              null
            </span>
          </div>

          {/* Controls to add/remove */}
          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4">
            <Input
              label="Add node"
              placeholder="Value, e.g. 99"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-32"
            />
            <Button type="button" variant="secondary" size="md" onClick={addNode}>
              <Plus className="size-4" />
              Add
            </Button>

            <Select
              label="Remove node"
              value={removeTargetId}
              onChange={(e) => setRemoveTargetId(e.target.value)}
              className="w-36"
              disabled={nodes.length === 0}
            >
              <option value="">Select node</option>
              {nodes.map((n, i) => (
                <option key={n.id} value={n.id}>
                  Node {i + 1} ({n.value})
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={removeNode}
              disabled={!removeTargetId}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
