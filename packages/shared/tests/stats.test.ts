import { describe, expect, it } from "vitest";
import { aggregateShifts } from "../src/index";

describe("aggregateShifts", () => {
  it("calculates totals", () => {
    const result = aggregateShifts([
      { date: "2024-06-01", startTime: "09:00", endTime: "17:00", breakMin: 60, rate: 500 },
      { date: "2024-06-02", startTime: "10:00", endTime: "14:00", breakMin: 0, rate: 600 }
    ]);

    expect(result.totalShifts).toBe(2);
    expect(result.totalHours).toBe(11);
    expect(result.totalEarnings).toBe(6100);
  });
});
