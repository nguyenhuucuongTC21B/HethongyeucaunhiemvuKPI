"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: "user" | "technician" | "admin";
  department: string;
  title: string;
  email?: string;
  phone?: string;
  mustChangePassword?: boolean;
}

export interface SystemInfo {
  storageMode: "drive" | "local";
  mailConfigured: boolean;
  mailEnabled: boolean;
}

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: SessionUser | null; system?: SystemInfo }>("/api/auth/me");
      setUser(data.user);
      if (data.system) setSystem(data.system);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { user, system, loading, refresh };
}
