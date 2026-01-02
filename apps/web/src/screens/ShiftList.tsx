import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAppStore } from "../lib/store";
import { Card } from "../components/Card";

export function ShiftList() {
  const { workspaceId } = useParams();
  const token = useAppStore((state) => state.token);
  const shifts = useAppStore((state) => state.shifts);
  const setShifts = useAppStore((state) => state.setShifts);

  useEffect(() => {
    async function load() {
      if (!workspaceId || !token) return;
      const data = await apiFetch(`/shifts?workspaceId=${workspaceId}`, {}, token);
      setShifts(data);
    }
    load();
  }, [workspaceId, token, setShifts]);

  return (
    <div className="min-h-screen space-y-4 px-4 py-6">
      <h1 className="text-xl font-semibold">Shifts</h1>
      <div className="space-y-3">
        {shifts.map((shift) => (
          <Card key={shift.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{shift.date}</p>
                <p className="text-lg font-semibold">{shift.startTime} - {shift.endTime}</p>
              </div>
              <p className="text-sm text-slate-200">{shift.rate}₽/h</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
