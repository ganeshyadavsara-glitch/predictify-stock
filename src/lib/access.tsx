import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Role = "Admin" | "Manager" | "Staff";

export type Permission =
  | "inventory.view"
  | "inventory.update"
  | "ai.view"
  | "reorder.manage"
  | "risk.view"
  | "analytics.view"
  | "users.manage";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Admin: [
    "inventory.view",
    "inventory.update",
    "ai.view",
    "reorder.manage",
    "risk.view",
    "analytics.view",
    "users.manage",
  ],
  Manager: ["inventory.view", "inventory.update", "ai.view", "reorder.manage", "risk.view", "analytics.view"],
  Staff: ["inventory.view", "inventory.update"],
};

export const ROLE_SUMMARY: Record<Role, string> = {
  Admin: "Full access, including user management",
  Manager: "Inventory, AI intelligence and reorder",
  Staff: "Inventory view and update only",
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
};

const SEED_USERS: AppUser[] = [
  { id: "u-001", name: "Ganesh Sara", email: "ganesh@stockpilot.ai", role: "Admin", active: true, createdAt: "2026-01-12" },
  { id: "u-002", name: "Priya Nair", email: "priya.nair@stockpilot.ai", role: "Manager", active: true, createdAt: "2026-02-03" },
  { id: "u-003", name: "Rohit Malhotra", email: "rohit.m@stockpilot.ai", role: "Manager", active: true, createdAt: "2026-02-19" },
  { id: "u-004", name: "Aisha Khan", email: "aisha.khan@stockpilot.ai", role: "Staff", active: true, createdAt: "2026-03-08" },
  { id: "u-005", name: "Vikram Rao", email: "vikram.rao@stockpilot.ai", role: "Staff", active: false, createdAt: "2026-03-22" },
];

const STORAGE_KEY = "stockpilot.users.v1";
const CURRENT_KEY = "stockpilot.currentUser.v1";

type AccessValue = {
  users: AppUser[];
  currentUser: AppUser;
  setCurrentUserId: (id: string) => void;
  addUser: (input: Omit<AppUser, "id" | "createdAt">) => void;
  updateUser: (id: string, patch: Partial<Omit<AppUser, "id" | "createdAt">>) => void;
  removeUser: (id: string) => void;
  can: (permission: Permission) => boolean;
};

const AccessContext = createContext<AccessValue | null>(null);

function readUsers(): AppUser[] {
  if (typeof window === "undefined") return SEED_USERS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_USERS;
    const parsed = JSON.parse(raw) as AppUser[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_USERS;
  } catch {
    return SEED_USERS;
  }
}

export function AccessProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(SEED_USERS);
  const [currentId, setCurrentId] = useState<string>(SEED_USERS[0]!.id);

  useEffect(() => {
    const stored = readUsers();
    setUsers(stored);
    const savedCurrent = window.localStorage.getItem(CURRENT_KEY);
    const valid = stored.find((u) => u.id === savedCurrent && u.active) ?? stored.find((u) => u.active) ?? stored[0]!;
    setCurrentId(valid.id);
  }, []);

  const persist = useCallback((next: AppUser[]) => {
    setUsers(next);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setCurrentUserId = useCallback((id: string) => {
    setCurrentId(id);
    if (typeof window !== "undefined") window.localStorage.setItem(CURRENT_KEY, id);
  }, []);

  const addUser = useCallback(
    (input: Omit<AppUser, "id" | "createdAt">) => {
      const user: AppUser = {
        ...input,
        id: `u-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      persist([...users, user]);
    },
    [persist, users],
  );

  const updateUser = useCallback(
    (id: string, patch: Partial<Omit<AppUser, "id" | "createdAt">>) => {
      persist(users.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    },
    [persist, users],
  );

  const removeUser = useCallback(
    (id: string) => {
      const next = users.filter((u) => u.id !== id);
      if (next.length === 0) return;
      persist(next);
      if (id === currentId) setCurrentUserId(next[0]!.id);
    },
    [currentId, persist, setCurrentUserId, users],
  );

  const currentUser = users.find((u) => u.id === currentId) ?? users[0] ?? SEED_USERS[0]!;

  const value = useMemo<AccessValue>(
    () => ({
      users,
      currentUser,
      setCurrentUserId,
      addUser,
      updateUser,
      removeUser,
      can: (permission: Permission) =>
        currentUser.active && ROLE_PERMISSIONS[currentUser.role].includes(permission),
    }),
    [addUser, currentUser, removeUser, setCurrentUserId, updateUser, users],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess(): AccessValue {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used inside AccessProvider");
  return ctx;
}