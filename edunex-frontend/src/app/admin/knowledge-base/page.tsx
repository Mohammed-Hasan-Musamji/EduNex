"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { demoSubjects } from "@/lib/demo-data";
import { adminKnowledgeBaseApi, subjectsApi } from "@/lib/api-client";
import { documentUploadSchema } from "@/lib/schemas";
import { formatDate, truncate } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import type { AcademicDocument, RetrievedChunk } from "@/types/content";
import type { Subject } from "@/types/content";

const stageTone = {
  uploaded: "neutral",
  chunking: "info",
  embedding: "info",
  indexed: "success",
  failed: "error",
} as const;

export default function KnowledgeBasePage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<AcademicDocument[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>(demoSubjects);
  const [subjectId, setSubjectId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [ingestingId, setIngestingId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [retrievedChunks, setRetrievedChunks] = useState<RetrievedChunk[] | null>(null);
  const [retrievalNotice, setRetrievalNotice] = useState<string | null>(null);

  const loadDocuments = async () => {
    setLoadError(null);
    const result = await adminKnowledgeBaseApi.listDocuments();
    if (!result.ok) {
      setLoadError(result.error.message);
      setDocuments([]);
      return;
    }
    setDocuments(result.data);
  };

  useEffect(() => {
    // Initial data fetch on mount -- intentionally sets state once loaded.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDocuments();
    void subjectsApi.list(true).then((res) => {
      if (res.ok && res.data.length > 0) setSubjects(res.data);
    });
  }, []);

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    const parsed = documentUploadSchema.safeParse({ file, subjectId });
    if (!parsed.success) {
      setUploadError(parsed.error.issues[0]?.message ?? "Choose a valid file");
      return;
    }
    if (!title.trim()) {
      setUploadError("Enter a title for this document");
      return;
    }
    if (isUploading) return;
    setUploadError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("file", parsed.data.file);
    if (parsed.data.subjectId) formData.set("subject_id", parsed.data.subjectId);

    const result = await adminKnowledgeBaseApi.uploadFile(formData);
    setIsUploading(false);

    if (!result.ok) {
      showToast({ variant: "error", title: "File couldn't be processed", description: result.error.message });
      return;
    }

    setDocuments((current) => [result.data, ...(current ?? [])]);
    showToast({
      variant: "success",
      title: "Document uploaded",
      description: "Click \"Ingest\" below to chunk, embed, and index it.",
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTitle("");
  };

  const handleIngest = async (document: AcademicDocument) => {
    setIngestingId(document.id);
    const result = await adminKnowledgeBaseApi.ingest(document.id);
    setIngestingId(null);
    if (!result.ok) {
      showToast({ variant: "error", title: "Ingestion unavailable", description: result.error.message });
      return;
    }
    setDocuments((current) =>
      (current ?? []).map((d) =>
        d.id === document.id ? { ...d, ingestionStatus: result.data.ingestionStatus, chunkCount: result.data.chunkCount, failureDetail: result.data.failureDetail } : d,
      ),
    );
    if (result.data.ingestionStatus === "indexed") {
      showToast({ variant: "success", title: "Document indexed", description: `${result.data.chunkCount} chunks embedded and stored.` });
    } else {
      showToast({ variant: "warning", title: "Ingestion failed", description: result.data.failureDetail ?? "Check server logs for details." });
    }
  };

  const handleTestRetrieval = async () => {
    const trimmed = query.trim();
    if (!trimmed || isRetrieving) return;
    setIsRetrieving(true);
    setRetrievalNotice(null);
    const result = await adminKnowledgeBaseApi.search(trimmed);
    if (!result.ok) {
      setRetrievalNotice(result.error.message);
      setRetrievedChunks(null);
    } else {
      setRetrievedChunks(result.data.results);
      setRetrievalNotice(result.data.warning);
    }
    setIsRetrieving(false);
  };

  const columns: DataTableColumn<AcademicDocument>[] = [
    { key: "title", header: "Title", render: (doc) => doc.title },
    { key: "subjectId", header: "Subject", render: (doc) => subjects.find((s) => s.id === doc.subjectId)?.name ?? "—" },
    {
      key: "stage",
      header: "Processing stage",
      render: (doc) => <StatusBadge label={doc.ingestionStatus} tone={stageTone[doc.ingestionStatus]} />,
    },
    { key: "chunkCount", header: "Chunks", render: (doc) => doc.chunkCount },
    { key: "createdAt", header: "Uploaded", render: (doc) => formatDate(doc.createdAt) },
    {
      key: "actions",
      header: "Actions",
      render: (doc) => (
        <div>
          <Button size="sm" variant="secondary" isLoading={ingestingId === doc.id} onClick={() => void handleIngest(doc)}>
            {doc.ingestionStatus === "failed" ? "Retry ingest" : "Ingest"}
          </Button>
          {doc.failureDetail && <p className="mt-1 text-xs text-error">{doc.failureDetail}</p>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Academic Content & Knowledge Base"
        description="Upload source material and monitor the retrieval-augmented generation pipeline."
      />

      <Card>
        <CardTitle>Upload a document</CardTitle>
        <CardDescription>Plain text (.txt) or Markdown (.md) only, up to 25MB.</CardDescription>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Linked Lists — Chapter 3" className="w-56" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="kb-file" className="text-sm font-medium text-text">
              File
            </label>
            <input
              ref={fileInputRef}
              id="kb-file"
              type="file"
              accept=".txt,.md,.markdown"
              className="text-sm text-text file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:text-text file:px-3 file:py-1.5 file:text-sm"
            />
          </div>
          <Select label="Subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="w-48">
            <option value="">None</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>
          <Button onClick={() => void handleUpload()} isLoading={isUploading}>
            <Upload className="size-4" aria-hidden="true" />
            Upload
          </Button>
        </div>
        {uploadError && (
          <p className="mt-2 text-sm text-error" role="alert">
            {uploadError}
          </p>
        )}
      </Card>

      <div className="mt-6">
        {documents === null ? (
          <LoadingState label="Loading documents…" />
        ) : loadError ? (
          <ErrorState description={loadError} onRetry={() => void loadDocuments()} />
        ) : (
          <DataTable columns={columns} rows={documents} getRowId={(doc) => doc.id} emptyMessage="No documents uploaded yet." />
        )}
      </div>

      <Card className="mt-6">
        <CardTitle>Semantic retrieval test</CardTitle>
        <CardDescription>Query the knowledge base the same way lesson generation would.</CardDescription>
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. how does removing a node work?"
              aria-label="Retrieval test query"
              className="pl-9"
            />
          </div>
          <Button onClick={() => void handleTestRetrieval()} isLoading={isRetrieving} disabled={!query.trim()}>
            Test retrieval
          </Button>
        </div>

        {retrievalNotice && <p className="mt-3 text-sm text-text-muted">{retrievalNotice}</p>}

        {retrievedChunks && retrievedChunks.length > 0 && (
          <ul className="mt-4 flex flex-col gap-3">
            {retrievedChunks.map((chunk) => (
              <li key={chunk.chunkId} className="rounded-md border border-border bg-ivory p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-text">{chunk.documentTitle}</p>
                  <span className="text-xs text-text-muted">similarity {chunk.similarityScore.toFixed(2)}</span>
                </div>
                <p className="mt-1 text-text-muted">{truncate(chunk.excerpt, 160)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
