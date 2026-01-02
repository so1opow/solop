import { create } from "zustand";

type User = {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
};

type Workspace = {
  id: string;
  title: string;
  type: string;
  linkedChatId?: string | null;
};

type JobPost = {
  id: string;
  text: string;
  status: string;
  extractedJson?: any;
};

type Shift = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  rate: number;
};

type AppState = {
  token: string | null;
  user: User | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  jobPosts: JobPost[];
  shifts: Shift[];
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setJobPosts: (posts: JobPost[]) => void;
  setShifts: (shifts: Shift[]) => void;
};

export const useAppStore = create<AppState>((set) => ({
  token: null,
  user: null,
  workspaces: [],
  currentWorkspace: null,
  jobPosts: [],
  shifts: [],
  setToken: (token) => set({ token }),
  setUser: (user) => set({ user }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  setCurrentWorkspace: (currentWorkspace) => set({ currentWorkspace }),
  setJobPosts: (jobPosts) => set({ jobPosts }),
  setShifts: (shifts) => set({ shifts })
}));
