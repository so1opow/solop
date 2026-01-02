import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAppStore } from "../lib/store";
import { Card } from "../components/Card";
import { Chip } from "../components/Chip";

export function Inbox() {
  const { workspaceId } = useParams();
  const token = useAppStore((state) => state.token);
  const jobPosts = useAppStore((state) => state.jobPosts);
  const setJobPosts = useAppStore((state) => state.setJobPosts);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      if (!workspaceId || !token) return;
      const posts = await apiFetch(`/job-posts?workspaceId=${workspaceId}`, {}, token);
      setJobPosts(posts);
    }
    load();
  }, [workspaceId, token, setJobPosts]);

  return (
    <div className="min-h-screen space-y-4 px-4 py-6">
      <h1 className="text-xl font-semibold">Inbox</h1>
      <div className="space-y-3">
        {jobPosts.map((post) => (
          <button key={post.id} onClick={() => navigate(`/workspace/${workspaceId}/job/${post.id}`)} className="w-full text-left">
            <Card>
              <p className="text-sm text-slate-200">{post.text}</p>
              <div className="mt-2 flex gap-2">
                <Chip>{post.status}</Chip>
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
