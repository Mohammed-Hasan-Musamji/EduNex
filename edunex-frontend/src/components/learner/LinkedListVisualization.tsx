"use client";

import { useId, useState } from "react";
import { ArrowRight, Plus, RotateCcw, StepForward, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn, generateId } from "@/lib/utils";

interface ListNode {
  id: string;
  value: string;
}

const DEFAULT_VALUES = ["12", "7", "34"];

interface LinkedListVisualizationProps {
  /** Seed node values from the lesson's validated config (see schemas/lesson.py LinkedListVisualizationConfig). */
  initialValues?: string[];
}

export function LinkedListVisualization({ initialValues }: LinkedListVisualizationProps) {
  const [nodes, setNodes] = useState<ListNode[]>(() =>
    (initialValues && initialValues.length > 0 ? initialValues : DEFAULT_VALUES).map((value) => ({
      id: generateId("node"),
      value,
    })),
  );
  const [newValue, setNewValue] = useState("");
  const [removeTargetId, setRemoveTargetId] = useState("");
  const [traversalIndex, setTraversalIndex] = useState<number | null>(null);
  const liveRegionId = useId();

  const addNode = () => {
    const value = newValue.trim();
    if (!value) return;
    setNodes((current) => [...current, { id: generateId("node"), value }]);
    setNewValue("");
    setTraversalIndex(null);
  };

  const removeNode = () => {
    if (!removeTargetId) return;
    setNodes((current) => current.filter((node) => node.id !== removeTargetId));
    setRemoveTargetId("");
    setTraversalIndex(null);
  };

  const startTraversal = () => setTraversalIndex(nodes.length > 0 ? 0 : null);
  const stepForward = () =>
    setTraversalIndex((current) => {
      if (current === null) return nodes.length > 0 ? 0 : null;
      return current + 1 < nodes.length ? current + 1 : null;
    });
  const resetTraversal = () => setTraversalIndex(null);

  const liveMessage =
    traversalIndex === null
      ? "Traversal not active."
      : `At node ${traversalIndex + 1} of ${nodes.length}, value ${nodes[traversalIndex]?.value}.`;

  return (
    <div className="rounded-md border border-border bg-ivory p-4">
      <div
        role="group"
        aria-label="Linked list visualization"
        className="flex min-h-[96px] flex-wrap items-center gap-1 overflow-x-auto py-2"
      >
        <span className="mr-1 rounded-full border border-border bg-white px-2 py-1 text-xs font-medium text-text-muted">
          head
        </span>
        <ArrowRight className="size-4 shrink-0 text-text-muted" aria-hidden="true" />

        {nodes.length === 0 && (
          <span className="rounded-md border border-dashed border-border bg-white px-4 py-3 text-sm text-text-muted">
            List is empty — add a node to begin.
          </span>
        )}

        {nodes.map((node, index) => (
          <div key={node.id} className="flex shrink-0 items-center gap-1">
            <div
              className={cn(
                "flex min-w-14 flex-col items-center rounded-md border px-3 py-2 text-center",
                traversalIndex === index ? "border-primary bg-[color-mix(in_srgb,var(--color-primary)_10%,white)]" : "border-border bg-white",
              )}
              aria-current={traversalIndex === index ? "step" : undefined}
            >
              <span className="text-sm font-semibold text-text">{node.value}</span>
              <span className="text-[10px] text-text-muted">node {index + 1}</span>
            </div>
            <ArrowRight className="size-4 shrink-0 text-text-muted" aria-hidden="true" />
          </div>
        ))}

        <span className="rounded-full border border-border bg-white px-2 py-1 text-xs font-medium text-text-muted">
          null
        </span>
      </div>

      <p id={liveRegionId} aria-live="polite" className="sr-only">
        {liveMessage}
      </p>
      {traversalIndex !== null && (
        <p className="mt-1 text-xs text-text-muted" aria-hidden="true">
          {liveMessage}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4">
        <Input
          label="Add node"
          placeholder="Value, e.g. 42"
          value={newValue}
          onChange={(event) => setNewValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addNode();
            }
          }}
          className="w-32"
        />
        <Button type="button" variant="secondary" size="md" onClick={addNode} aria-label="Add node to the end of the list">
          <Plus className="size-4" aria-hidden="true" />
          Add
        </Button>

        <Select
          label="Remove node"
          value={removeTargetId}
          onChange={(event) => setRemoveTargetId(event.target.value)}
          className="w-36"
          disabled={nodes.length === 0}
        >
          <option value="">Select a node</option>
          {nodes.map((node, index) => (
            <option key={node.id} value={node.id}>
              Node {index + 1} ({node.value})
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={removeNode}
          disabled={!removeTargetId}
          aria-label="Remove selected node"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Remove
        </Button>

        <div className="ml-auto flex gap-2">
          <Button type="button" variant="secondary" size="md" onClick={startTraversal} disabled={nodes.length === 0}>
            Start traversal
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={stepForward}
            disabled={nodes.length === 0}
            aria-label="Step to the next node"
          >
            <StepForward className="size-4" aria-hidden="true" />
            Step
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={resetTraversal}
            disabled={traversalIndex === null}
            aria-label="Reset traversal"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
