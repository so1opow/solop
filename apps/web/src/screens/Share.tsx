import { useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAppStore } from "../lib/store";
import { Button } from "../components/Button";
import { Card } from "../components/Card";

const templates = [
  { id: "shift", label: "I took a shift", text: "✅ I took a shift today." },
  { id: "conditions", label: "Shift conditions", text: "📌 Shift conditions: rate, time, perks." },
  { id: "summary", label: "Weekly summary", text: "📊 Weekly summary incoming." }
];

export function Share() {
  const { workspaceId } = useParams();
  const token = useAppStore((state) => state.token);
  const [selected, setSelected] = useState(templates[0]);
  const [status, setStatus] = useState<string | null>(null);

  async function handleShare() {
    if (!workspaceId || !token) return;
    await apiFetch(
      "/share",
      {
        method: "POST",
        body: JSON.stringify({ workspaceId, message: selected.text })
      },
      token
    );
    setStatus("Shared to group");
  }

  return (
    <div className="min-h-screen space-y-4 px-4 py-6">
      <h1 className="text-xl font-semibold">Share</h1>
      <Card>
        <div className="space-y-2">
          {templates.map((template) => (
            <label key={template.id} className="flex items-center gap-2 text-sm">
              <input type="radio" checked={selected.id === template.id} onChange={() => setSelected(template)} />
              {template.label}
            </label>
          ))}
        </div>
      </Card>
      <Button onClick={handleShare}>Send to group</Button>
      {status && <p className="text-sm text-slate-400">{status}</p>}
    </div>
  );
}
