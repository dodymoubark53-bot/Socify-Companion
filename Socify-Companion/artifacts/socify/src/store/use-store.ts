import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@workspace/api-client-react";

interface AppState {
  token: string | null;
  user: User | null;
  workspaceId: number;
  setAuth: (token: string | null, user: User | null) => void;
  setWorkspaceId: (id: number) => void;
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      workspaceId: 1, // Default workspace
      setAuth: (token, user) => set({ token, user }),
      setWorkspaceId: (workspaceId) => set({ workspaceId }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "socify-storage",
    }
  )
);
