import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAppStore } from "../lib/store";
import { Card } from "../components/Card";

export function Members() {
  const { workspaceId } = useParams();
  const token = useAppStore((state) => state.token);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      if (!workspaceId || !token) return;
      const data = await apiFetch(`/memberships/${workspaceId}`, {}, token);
      setMembers(data);
    }
    load();
  }, [workspaceId, token]);

  return (
    <div className="min-h-screen space-y-4 px-4 py-6">
      <h1 className="text-xl font-semibold">Members</h1>
      <div className="space-y-3">
        {members.map((member) => (
          <Card key={member.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{member.role}</p>
                <p className="text-lg font-semibold">{member.user.username ?? member.user.firstName ?? "User"}</p>
              </div>
              <p className="text-xs text-slate-400">Pace: steady</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
