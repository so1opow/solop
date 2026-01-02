import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAppStore } from "../lib/store";
import { Card } from "../components/Card";
import { Button } from "../components/Button";

export function Dashboard() {
  const { workspaceId } = useParams();
  const token = useAppStore((state) => state.token);
  const workspaces = useAppStore((state) => state.workspaces);
  const [stats, setStats] = useState<{ overall: { totalEarnings: number; totalHours: number; totalShifts: number } } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      if (!workspaceId || !token) return;
      const data = await apiFetch(`/stats/${workspaceId}`, {}, token);
      setStats(data);
    }
    load();
  }, [workspaceId, token]);

  const workspace = workspaces.find((item) => item.id === workspaceId);

  return (
    <div className="min-h-screen space-y-4 px-4 py-6">
      <div className="space-y-1">
        <p className="text-sm text-slate-400">Workspace</p>
        <h1 className="text-xl font-semibold">{workspace?.title ?? "Workspace"}</h1>
      </div>
      <Card>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-slate-400">Earnings</p>
            <p className="text-lg font-semibold">{stats?.overall.totalEarnings ?? 0}₽</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Hours</p>
            <p className="text-lg font-semibold">{stats?.overall.totalHours ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Shifts</p>
            <p className="text-lg font-semibold">{stats?.overall.totalShifts ?? 0}</p>
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => navigate(`/workspace/${workspaceId}/shift/new`)}>Add Shift</Button>
        <Button onClick={() => navigate(`/workspace/${workspaceId}/inbox`)}>Inbox</Button>
        <Button onClick={() => navigate(`/workspace/${workspaceId}/members`)}>Members</Button>
        <Button onClick={() => navigate(`/workspace/${workspaceId}/share`)}>Share</Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => navigate(`/workspace/${workspaceId}/shifts`)}>Shifts</Button>
        <Button onClick={() => navigate(`/workspace/${workspaceId}/stats`)}>Stats</Button>
      </div>
    </div>
  );
}
