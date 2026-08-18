import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, ShieldCheck, Trash2, UserCheck, Users, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Shell } from "@/components/app/Shell";
import { EmptyState, MetricCard, PageHeader } from "@/components/app/bits";
import { ROLE_SUMMARY, useAccess, type AppUser, type Role } from "@/lib/access";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "User Management — StockPilot AI" },
      {
        name: "description",
        content: "Manage StockPilot AI users, assign Admin, Manager or Staff roles and control active access.",
      },
      { property: "og:title", content: "User Management — StockPilot AI" },
      { property: "og:description", content: "Role-based access control for your inventory intelligence team." },
    ],
  }),
  component: UsersPage,
});

const ROLES: Role[] = ["Admin", "Manager", "Staff"];

const roleStyles: Record<Role, string> = {
  Admin: "bg-primary/12 text-primary border-primary/30",
  Manager: "bg-info/15 text-info border-info/30",
  Staff: "bg-muted text-muted-foreground border-border",
};

type Draft = { name: string; email: string; role: Role; active: boolean };

const EMPTY_DRAFT: Draft = { name: "", email: "", role: "Staff", active: true };

function UsersPage() {
  const { users, currentUser, addUser, updateUser, removeUser } = useAccess();
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [formOpen, setFormOpen] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setFormOpen(true);
  };

  const openEdit = (u: AppUser) => {
    setEditing(u);
    setDraft({ name: u.name, email: u.email, role: u.role, active: u.active });
    setFormOpen(true);
  };

  const submit = () => {
    if (!draft.name.trim() || !draft.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (editing) {
      updateUser(editing.id, draft);
      toast.success(`${draft.name} updated`);
    } else {
      addUser(draft);
      toast.success(`${draft.name} added as ${draft.role}`);
    }
    setFormOpen(false);
    setEditing(null);
  };

  const activeCount = users.filter((u) => u.active).length;
  const adminCount = users.filter((u) => u.role === "Admin").length;

  return (
    <Shell require="users.manage">
      <PageHeader
        eyebrow="Access Control"
        title="User Management"
        description="Add teammates, assign roles and switch users on or off. Roles decide which parts of StockPilot AI each person can reach."
        actions={
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            <Plus className="size-3.5" /> Add user
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total users" value={`${users.length}`} sub="In this workspace" icon={Users} />
        <MetricCard label="Active" value={`${activeCount}`} sub="Can sign in and act" icon={UserCheck} tone="positive" delay={60} />
        <MetricCard label="Inactive" value={`${users.length - activeCount}`} sub="Access suspended" icon={UserX} tone="warning" delay={120} />
        <MetricCard label="Admins" value={`${adminCount}`} sub="Full platform access" icon={ShieldCheck} delay={180} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r} className="panel p-4">
            <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold", roleStyles[r])}>{r}</span>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{ROLE_SUMMARY[r]}</p>
          </div>
        ))}
      </section>

      {formOpen ? (
        <section className="panel animate-rise space-y-4 p-5">
          <p className="text-sm font-semibold text-foreground">{editing ? `Edit ${editing.name}` : "Add a new user"}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-xs">
              <span className="text-muted-foreground">Full name</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                placeholder="Asha Verma"
              />
            </label>
            <label className="space-y-1.5 text-xs">
              <span className="text-muted-foreground">Email</span>
              <input
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                placeholder="asha@stockpilot.ai"
              />
            </label>
            <label className="space-y-1.5 text-xs">
              <span className="text-muted-foreground">Role</span>
              <select
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                className="size-4 rounded border-border"
              />
              Active
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
            >
              {editing ? "Save changes" : "Create user"}
            </button>
            <button
              type="button"
              onClick={() => { setFormOpen(false); setEditing(null); }}
              className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {users.length === 0 ? (
        <EmptyState title="No users yet" description="Add your first teammate to give them access." />
      ) : (
        <section className="panel animate-rise overflow-hidden">
          <div className="border-b border-border/70 px-5 py-3.5">
            <p className="text-sm font-semibold text-foreground">Team members</p>
            <p className="text-xs text-muted-foreground">Role-based access is applied instantly</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {["User", "Role", "Status", "Added", "Actions"].map((h) => (
                    <th key={h} className="px-3 py-2.5 font-medium first:pl-5 last:pr-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/40 last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-3 pl-5">
                      <p className="font-medium text-foreground">
                        {u.name}
                        {u.id === currentUser.id ? (
                          <span className="ml-2 rounded bg-primary/12 px-1.5 py-0.5 text-[10px] font-semibold text-primary">You</span>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium", roleStyles[u.role])}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => updateUser(u.id, { active: !u.active })}
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[11px] font-medium",
                          u.active ? "border-success/35 bg-success/15 text-success" : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {u.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="num px-3 py-3 text-muted-foreground">{u.createdAt}</td>
                    <td className="px-3 py-3 pr-5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Edit ${u.name}`}
                          onClick={() => openEdit(u)}
                          className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${u.name}`}
                          onClick={() => {
                            removeUser(u.id);
                            toast.success(`${u.name} removed`);
                          }}
                          className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-critical"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </Shell>
  );
}