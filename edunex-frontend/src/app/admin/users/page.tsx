"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { demoAdminUsers } from "@/lib/demo-data";
import { adminUsersApi } from "@/lib/api-client";
import { isBackendUnavailable } from "@/types/api";
import { formatDate } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import type { AccountStatus, AdminRole, AdminUserRecord } from "@/types/learner";

const PAGE_SIZE = 3;

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUserRecord[]>(demoAdminUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AdminRole>("all");
  const [page, setPage] = useState(1);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [confirmingStatusChangeId, setConfirmingStatusChangeId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery = !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [users, search, roleFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const applyUserPatch = async (
    user: AdminUserRecord,
    patch: { role?: AdminRole; status?: AccountStatus },
  ) => {
    if (pendingUserId) return;
    setPendingUserId(user.id);
    const result = await adminUsersApi.updateUser(user.id, patch);
    if (!result.ok && !isBackendUnavailable(result.error)) {
      showToast({ variant: "error", title: "Couldn't update user", description: result.error.message });
      setPendingUserId(null);
      return;
    }
    setUsers((current) => current.map((u) => (u.id === user.id ? { ...u, ...patch } : u)));
    showToast({
      variant: "success",
      title: "User updated",
      description:
        result.ok === false
          ? "Applied locally — this is not yet persisted by the backend."
          : `${user.name}'s account was updated.`,
    });
    setPendingUserId(null);
    setConfirmingStatusChangeId(null);
  };

  const columns: DataTableColumn<AdminUserRecord>[] = [
    { key: "name", header: "Name", render: (user) => <span className="font-medium">{user.name}</span> },
    { key: "email", header: "Email", render: (user) => user.email },
    {
      key: "role",
      header: "Role",
      render: (user) => (
        <Select
          value={user.role}
          disabled={pendingUserId === user.id}
          onChange={(event) => void applyUserPatch(user, { role: event.target.value as AdminRole })}
          className="h-9 w-32"
          aria-label={`Change role for ${user.name}`}
        >
          <option value="learner">Learner</option>
          <option value="admin">Admin</option>
        </Select>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (user) => <StatusBadge label={user.status} tone={user.status === "active" ? "success" : "neutral"} />,
    },
    { key: "joinedAt", header: "Joined", render: (user) => formatDate(user.joinedAt) },
    {
      key: "actions",
      header: "Actions",
      render: (user) =>
        confirmingStatusChangeId === user.id ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">
              {user.status === "active" ? "Deactivate" : "Activate"} this account?
            </span>
            <button
              type="button"
              className="font-medium text-primary underline"
              onClick={() =>
                void applyUserPatch(user, { status: user.status === "active" ? "inactive" : "active" })
              }
            >
              Confirm
            </button>
            <button type="button" className="font-medium underline" onClick={() => setConfirmingStatusChangeId(null)}>
              Cancel
            </button>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            disabled={pendingUserId === user.id}
            onClick={() => setConfirmingStatusChangeId(user.id)}
          >
            {user.status === "active" ? "Deactivate" : "Activate"}
          </Button>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="User Management" description="Search, filter, and manage learner and admin accounts." />

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search name or email"
            aria-label="Search users"
            className="pl-9"
          />
        </div>
        <Select
          label="Role"
          value={roleFilter}
          onChange={(event) => {
            setRoleFilter(event.target.value as "all" | AdminRole);
            setPage(1);
          }}
          className="w-36"
        >
          <option value="all">All roles</option>
          <option value="learner">Learner</option>
          <option value="admin">Admin</option>
        </Select>
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={pageRows}
          getRowId={(user) => user.id}
          emptyMessage="No users match your filters."
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
        />
      </div>

      <p className="mt-3 text-xs text-text-muted">
        Frontend role checks are not a security boundary — the backend must independently enforce authorization.
      </p>
    </div>
  );
}
