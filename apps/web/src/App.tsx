import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "./lib/api";
import { decodeStartAppPayload, getInitData, getStartAppPayload, isTelegramWebApp } from "./lib/telegram";
import { useAppStore } from "./lib/store";
import { ModePicker } from "./screens/ModePicker";
import { WorkspaceSelector } from "./screens/WorkspaceSelector";
import { Dashboard } from "./screens/Dashboard";
import { Inbox } from "./screens/Inbox";
import { Analyzer } from "./screens/Analyzer";
import { ShiftForm } from "./screens/ShiftForm";
import { ShiftList } from "./screens/ShiftList";
import { Stats } from "./screens/Stats";
import { Members } from "./screens/Members";
import { Share } from "./screens/Share";

function AuthGate() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const setToken = useAppStore((state) => state.setToken);
  const setUser = useAppStore((state) => state.setUser);
  const setWorkspaces = useAppStore((state) => state.setWorkspaces);
  const navigate = useNavigate();
  const startPayload = useMemo(() => {
    const raw = getStartAppPayload();
    return raw ? decodeStartAppPayload(raw) : null;
  }, []);

  useEffect(() => {
    async function run() {
      if (!isTelegramWebApp()) {
        setLoading(false);
        return;
      }
      const initData = getInitData();
      if (!initData) {
        setLoading(false);
        return;
      }
      try {
        const auth = await apiFetch("/auth/telegram", {
          method: "POST",
          body: JSON.stringify({ initData })
        });
        setToken(auth.token);
        setUser(auth.user);
        const workspaces = await apiFetch("/workspaces", {}, auth.token);
        setWorkspaces(workspaces);
        if (startPayload?.workspaceId && startPayload?.jobPostId) {
          navigate(`/workspace/${startPayload.workspaceId}/job/${startPayload.jobPostId}`);
        } else {
          navigate("/mode");
        }
      } catch (err: any) {
        setError(err.message || "Auth failed");
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [navigate, setToken, setUser, setWorkspaces, startPayload]);

  if (!isTelegramWebApp()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-lg font-semibold">Open in Telegram</h1>
        <p className="text-sm text-slate-400">This mini app works inside Telegram only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-slate-400">Loading…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthGate />
      <Routes>
        <Route path="/mode" element={<ModePicker />} />
        <Route path="/workspaces" element={<WorkspaceSelector />} />
        <Route path="/workspace/:workspaceId" element={<Dashboard />} />
        <Route path="/workspace/:workspaceId/inbox" element={<Inbox />} />
        <Route path="/workspace/:workspaceId/job/:jobPostId" element={<Analyzer />} />
        <Route path="/workspace/:workspaceId/shift/new" element={<ShiftForm />} />
        <Route path="/workspace/:workspaceId/shifts" element={<ShiftList />} />
        <Route path="/workspace/:workspaceId/stats" element={<Stats />} />
        <Route path="/workspace/:workspaceId/members" element={<Members />} />
        <Route path="/workspace/:workspaceId/share" element={<Share />} />
      </Routes>
    </BrowserRouter>
  );
}
