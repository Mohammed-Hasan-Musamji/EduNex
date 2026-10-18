"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { adminUsersApi } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { useLearner } from "@/hooks/use-learner";
import type { AdminUserRecord, UserRole } from "@/types/learner";

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const { learner: currentAdmin } = useLearner();
  const [users, setUsers] = useState<AdminUserRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [page, setPage] = useState(1);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoadError(null);
    const result = await adminUsersApi.list();
    if (!result.ok) {
      setLoadError(result.error.message);
      setUsers([]);
      return;
    }
    setUsers(result.data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (users ?? []).filter((user) => {
      const matchesQuery =
        !query || user.displayName.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [users, search, roleFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const changeRole = async (user: AdminUserRecord, role: UserRole) => {
    if (pendingUserId) return;
    setPendingUserId(user.id);
    const result = await adminUsersApi.updateRole(user.id, role);
    setPendingUserId(null);
    if (!result.ok) {
      showToast({ variant: "error", title: "Couldn't update role", description: result.error.message });
      return;
    }
    setUsers((current) => (current ?? []).map((u) => (u.id === user.id ? result.data : u)));
    showToast({ variant: "success", title: "Role updated", description: `${user.displayName} is now ${role}.` });
  };

  const columns: DataTableColumn<AdminUserRecord>[] = [
    { key: "displayName", header: "Name", render: (user) => <span className="font-medium">{user.displayName}</span> },
    { key: "email", header: "Email", render: (user) => user.email },
    {
      key: "role",
      header: "Role",
      render: (user) =>
        user.id === currentAdmin?.id ? (
          <span className="text-sm text-text-muted">{user.role} (you)</span>
        ) : (
          <Select
            value={user.role}
            disabled={pendingUserId === user.id}
            onChange={(event) => void changeRole(user, event.target.value as UserRole)}
            className="h-9 w-32"
            aria-label={`Change role for ${user.displayName}`}
          >
            <option value="learner">Learner</option>
            <option value="admin">Admin</option>
          </Select>
        ),
    },
    { key: "createdAt", header: "Joined", render: (user) => formatDate(user.createdAt) },
  ];

  return (
    <div>
      <PageHeader title="User Management" description="Search, filter, and manage real learner and admin accounts." />

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
            setRoleFilter(event.target.value as "all" | UserRole);
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
        {users === null ? (
          <LoadingState label="Loading users…" />
        ) : loadError ? (
          <ErrorState description={loadError} onRetry={() => void loadUsers()} />
        ) : (
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(user) => user.id}
            emptyMessage="No users match your filters."
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        )}
      </div>

      <p className="mt-3 text-xs text-text-muted">
        Frontend role checks are not a security boundary — every admin route independently re-verifies the
        caller&apos;s role on the server.
      </p>
    </div>
  );
}
