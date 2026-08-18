import { Link, useRouterState } from "@tanstack/react-router";
import {
  Boxes,
  Brain,
  CalendarClock,
  Gauge,
  LineChart,
  Menu,
  PackageSearch,
  Recycle,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
  ShieldAlert,
  Wand2,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { orchestrate } from "@/lib/agents";
import { useAccess, type Permission } from "@/lib/access";

const NAV = [
  { to: "/", label: "Executive Dashboard", icon: Gauge, group: "Overview", permission: "analytics.view" },
  { to: "/decisions", label: "AI Decision Center", icon: Sparkles, group: "Overview", permission: "ai.view" },
  { to: "/copilot", label: "AI Copilot", icon: Brain, group: "Overview", permission: "ai.view" },
  { to: "/inventory", label: "Inventory Explorer", icon: PackageSearch, group: "Operations", permission: "inventory.view" },
  { to: "/demand", label: "Demand Intelligence", icon: LineChart, group: "Operations", permission: "ai.view" },
  { to: "/reorder", label: "Smart Reorder", icon: ShoppingCart, group: "Operations", permission: "reorder.manage" },
  { to: "/dead-stock", label: "Dead Stock", icon: Recycle, group: "Risk", permission: "risk.view" },
  { to: "/expiry", label: "Expiry Command", icon: CalendarClock, group: "Risk", permission: "risk.view" },
  { to: "/suppliers", label: "Supplier Intelligence", icon: Truck, group: "Risk", permission: "risk.view" },
  { to: "/simulator", label: "What-If Simulator", icon: Wand2, group: "Risk", permission: "ai.view" },
  { to: "/users", label: "User Management", icon: Users, group: "Administration", permission: "users.manage" },
] as const;

const GROUPS = ["Overview", "Operations", "Risk", "Administration"] as const;

export function Shell({ children, require }: { children: ReactNode; require?: Permission }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { findings } = orchestrate();
  const criticalCount = findings.filter((f) => f.priority === "CRITICAL").length;
  const { users, currentUser, setCurrentUserId, can } = useAccess();
  const allowed = !require || can(require);
  const visibleNav = NAV.filter((item) => can(item.permission));

  return (
    <div className="aurora min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[264px] shrink-0 border-r border-border bg-sidebar/95 backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2 px-5 py-5">
              <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
                <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
                  <Boxes className="size-5" />
                </span>
                <span>
                  <span className="block font-display text-[15px] font-semibold leading-tight text-foreground">
                    StockPilot <span className="text-gradient">AI</span>
                  </span>
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Inventory Intelligence
                  </span>
                </span>
              </Link>
              <button
                type="button"
                aria-label="Close navigation"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
              {GROUPS.map((group) => (
                <div key={group}>
                  <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
                    {group}
                  </p>
                  <ul className="space-y-1">
                    {visibleNav.filter((n) => n.group === group).map((item) => {
                      const active =
                        item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                      return (
                        <li key={item.to}>
                          <Link
                            to={item.to}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                              active
                                ? "bg-primary/12 text-primary"
                                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                            )}
                          >
                            <item.icon className="size-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                            {item.to === "/decisions" && criticalCount > 0 ? (
                              <span className="num ml-auto rounded-full bg-critical/15 px-1.5 py-0.5 text-[10px] font-semibold text-critical">
                                {criticalCount}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="m-3 rounded-xl border border-border bg-surface-raised/60 p-3.5">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="pulse-dot absolute inline-flex size-2 rounded-full bg-primary" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">
                  6 agents online
                </p>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                Orchestrator last synced {findings.length} findings across the catalogue.
              </p>
            </div>
          </div>
        </aside>

        {open ? (
          <button
            aria-label="Close navigation overlay"
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          />
        ) : null}

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur-xl md:px-8">
            <button
              type="button"
              aria-label="Open navigation"
              className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-4" />
            </button>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Don&apos;t just track inventory —{" "}
              <span className="text-foreground">predict problems and act on them.</span>
            </p>
            <div className="ml-auto flex items-center gap-2">
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="hidden sm:inline">Signed in as</span>
                <select
                  aria-label="Switch user"
                  value={currentUser.id}
                  onChange={(e) => setCurrentUserId(e.target.value)}
                  className="max-w-[150px] rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} · {u.role}
                      {u.active ? "" : " (inactive)"}
                    </option>
                  ))}
                </select>
              </label>
              <Link
                to="/copilot"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5"
              >
                <Sparkles className="size-3.5" />
                Ask the Copilot
              </Link>
            </div>
          </header>

          <main className="flex-1 space-y-8 px-4 py-6 md:px-8 md:py-8">
            {allowed ? (
              children
            ) : (
              <div className="panel mx-auto mt-10 max-w-lg p-8 text-center">
                <span className="mx-auto grid size-11 place-items-center rounded-xl bg-critical/12 text-critical">
                  <ShieldAlert className="size-5" />
                </span>
                <h1 className="mt-4 text-lg font-semibold text-foreground">Access restricted</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {currentUser.active
                    ? `The ${currentUser.role} role doesn't have access to this area. Ask an Admin if you need it.`
                    : `${currentUser.name} is inactive. An Admin must reactivate this account.`}
                </p>
                {visibleNav[0] ? (
                  <Link
                    to={visibleNav[0].to}
                    className="mt-5 inline-flex rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    Go to {visibleNav[0].label}
                  </Link>
                ) : null}
              </div>
            )}
          </main>

          <footer className="border-t border-border/60 px-4 py-5 text-[11px] text-muted-foreground md:px-8">
            StockPilot AI · deterministic inventory intelligence · every number traced to catalogue data
          </footer>
        </div>
      </div>
    </div>
  );
}