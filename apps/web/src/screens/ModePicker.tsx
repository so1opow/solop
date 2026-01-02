import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";

export function ModePicker() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen space-y-4 px-4 py-6">
      <h1 className="text-xl font-semibold">Choose mode</h1>
      <div className="space-y-3">
        <button onClick={() => navigate("/workspaces")} className="w-full">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Solo</p>
                <p className="text-lg font-semibold">Just me</p>
              </div>
              <span className="text-2xl">⚡</span>
            </div>
          </Card>
        </button>
        <button onClick={() => navigate("/workspaces")} className="w-full">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">With people</p>
                <p className="text-lg font-semibold">Family / Crew</p>
              </div>
              <span className="text-2xl">👥</span>
            </div>
          </Card>
        </button>
      </div>
    </div>
  );
}
