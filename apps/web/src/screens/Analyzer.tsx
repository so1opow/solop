import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Chip } from "../components/Chip";
import { useAppStore } from "../lib/store";

export function Analyzer() {
  const { workspaceId, jobPostId } = useParams();
  const token = useAppStore((state) => state.token);
  const [post, setPost] = useState<any | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      if (!jobPostId || !token) return;
      const data = await apiFetch(`/job-posts/${jobPostId}`, {}, token);
      setPost(data);
    }
    load();
  }, [jobPostId, token]);

  const extracted = post?.extractedJson ?? {};

  return (
    <div className="min-h-screen space-y-4 px-4 py-6">
      <h1 className="text-xl font-semibold">Analyzer</h1>
      <Card>
        <p className="text-sm text-slate-200">{post?.text}</p>
      </Card>
      <div className="flex flex-wrap gap-2">
        {extracted?.date?.value && <Chip>📅 {extracted.date.value}</Chip>}
        {extracted?.timeRange?.value && <Chip>⏰ {extracted.timeRange.value}</Chip>}
        {extracted?.rate?.value && <Chip>💸 {extracted.rate.value}</Chip>}
        {(extracted?.perks ?? []).map((perk: string) => (
          <Chip key={perk}>{perk}</Chip>
        ))}
        {(extracted?.riskFlags ?? []).map((flag: string) => (
          <Chip key={flag}>⚠️ {flag}</Chip>
        ))}
      </div>
      <div className="space-y-2">
        <Button onClick={() => navigate(`/workspace/${workspaceId}/shift/new?jobPostId=${jobPostId}`)}>Create Shift</Button>
        <Button onClick={() => navigate(`/workspace/${workspaceId}/inbox`)}>Ask (stub)</Button>
        <Button onClick={() => navigate(`/workspace/${workspaceId}/inbox`)}>Discard</Button>
      </div>
    </div>
  );
}
