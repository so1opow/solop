import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAppStore } from "../lib/store";
import { Card } from "../components/Card";

export function Stats() {
  const { workspaceId } = useParams();
  const token = useAppStore((state) => state.token);
  const [stats, setStats] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      if (!workspaceId || !token) return;
      const data = await apiFetch(`/stats/${workspaceId}`, {}, token);
      setStats(data);
    }
    load();
  }, [workspaceId, token]);

  return (
    <div className="min-h-screen space-y-4 px-4 py-6">
      <h1 className="text-xl font-semibold">Stats</h1>
      <Card>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Total earnings</p>
            <p className="text-lg font-semibold">{stats?.overall?.totalEarnings ?? 0}₽</p>
          </div>
          <div>
            <p className="text-slate-400">Total hours</p>
            <p className="text-lg font-semibold">{stats?.overall?.totalHours ?? 0}</p>
          </div>
        </div>
      </Card>
      <Card>
        <p className="text-sm text-slate-400">Charts coming soon</p>
      </Card>
    </div>
  );
}
