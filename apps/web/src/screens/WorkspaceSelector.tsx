import { useNavigate } from "react-router-dom";
import { useAppStore } from "../lib/store";
import { apiFetch } from "../lib/api";
import { Button } from "../components/Button";
import { Card } from "../components/Card";

export function WorkspaceSelector() {
  const navigate = useNavigate();
  const token = useAppStore((state) => state.token);
  const workspaces = useAppStore((state) => state.workspaces);
  const setWorkspaces = useAppStore((state) => state.setWorkspaces);

  async function handleCreate() {
    if (!token) return;
    const workspace = await apiFetch(
      "/workspaces",
      { method: "POST", body: JSON.stringify({ title: "Solo", type: "SOLO" }) },
      token
    );
    setWorkspaces([workspace, ...workspaces]);
    navigate(`/workspace/${workspace.id}`);
  }

  return (
    <div className="min-h-screen space-y-4 px-4 py-6">
      <h1 className="text-xl font-semibold">Workspaces</h1>
      <div className="space-y-3">
        {workspaces.map((workspace) => (
          <button key={workspace.id} onClick={() => navigate(`/workspace/${workspace.id}`)} className="w-full">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{workspace.type}</p>
                  <p className="text-lg font-semibold">{workspace.title}</p>
                </div>
                <span>➜</span>
              </div>
            </Card>
          </button>
        ))}
      </div>
      <Button onClick={handleCreate}>Create Solo Workspace</Button>
    </div>
  );
}
