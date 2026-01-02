import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAppStore } from "../lib/store";
import { Button } from "../components/Button";
import { Card } from "../components/Card";

export function ShiftForm() {
  const { workspaceId } = useParams();
  const [searchParams] = useSearchParams();
  const jobPostId = searchParams.get("jobPostId");
  const token = useAppStore((state) => state.token);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    organizer: "",
    date: new Date().toISOString().slice(0, 10),
    startTime: "09:00",
    endTime: "18:00",
    breakMin: 60,
    rate: 500,
    perks: { food: false, taxi: false, instantPay: false },
    status: "PENDING"
  });

  useEffect(() => {
    async function load() {
      if (!jobPostId || !token) return;
      const post = await apiFetch(`/job-posts/${jobPostId}`, {}, token);
      const extracted = post?.extractedJson;
      setForm((prev) => ({
        ...prev,
        organizer: prev.organizer || post.authorTgUserId || "",
        date: extracted?.date?.value ?? prev.date,
        rate: extracted?.rate?.value ? Number(extracted.rate.value) : prev.rate,
        perks: {
          food: extracted?.perks?.includes("food") ?? false,
          taxi: extracted?.perks?.includes("taxi") ?? false,
          instantPay: extracted?.perks?.includes("instantPay") ?? false
        }
      }));
    }
    load();
  }, [jobPostId, token]);

  const estimate = useMemo(() => {
    const [sH, sM] = form.startTime.split(":").map(Number);
    const [eH, eM] = form.endTime.split(":").map(Number);
    const hours = Math.max(0, (eH * 60 + eM - (sH * 60 + sM) - form.breakMin) / 60);
    return Math.round(hours * form.rate);
  }, [form]);

  async function handleSubmit() {
    if (!workspaceId || !token) return;
    await apiFetch(
      "/shifts",
      {
        method: "POST",
        body: JSON.stringify({
          workspaceId,
          organizer: form.organizer || "Organizer",
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          breakMin: Number(form.breakMin),
          rate: Number(form.rate),
          perks: form.perks,
          status: form.status,
          sourceJobPostId: jobPostId ?? undefined
        })
      },
      token
    );
    navigate(`/workspace/${workspaceId}`);
  }

  return (
    <div className="min-h-screen space-y-4 px-4 py-6">
      <h1 className="text-xl font-semibold">Add Shift</h1>
      <Card>
        <div className="space-y-3">
          <input
            className="w-full rounded-lg bg-slate-900 p-2 text-sm"
            placeholder="Organizer"
            value={form.organizer}
            onChange={(event) => setForm({ ...form, organizer: event.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className="w-full rounded-lg bg-slate-900 p-2 text-sm" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            <input type="number" className="w-full rounded-lg bg-slate-900 p-2 text-sm" value={form.rate} onChange={(event) => setForm({ ...form, rate: Number(event.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="time" className="w-full rounded-lg bg-slate-900 p-2 text-sm" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
            <input type="time" className="w-full rounded-lg bg-slate-900 p-2 text-sm" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
          </div>
          <input
            type="number"
            className="w-full rounded-lg bg-slate-900 p-2 text-sm"
            value={form.breakMin}
            onChange={(event) => setForm({ ...form, breakMin: Number(event.target.value) })}
          />
          <div className="flex gap-2 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.perks.food}
                onChange={(event) => setForm({ ...form, perks: { ...form.perks, food: event.target.checked } })}
              />
              Food
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.perks.taxi}
                onChange={(event) => setForm({ ...form, perks: { ...form.perks, taxi: event.target.checked } })}
              />
              Taxi
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.perks.instantPay}
                onChange={(event) => setForm({ ...form, perks: { ...form.perks, instantPay: event.target.checked } })}
              />
              Instant
            </label>
          </div>
          <select
            className="w-full rounded-lg bg-slate-900 p-2 text-sm"
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value })}
          >
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue</option>
          </select>
          <p className="text-sm text-slate-400">Estimate: {estimate}₽</p>
        </div>
      </Card>
      <Button onClick={handleSubmit}>Save Shift</Button>
    </div>
  );
}
