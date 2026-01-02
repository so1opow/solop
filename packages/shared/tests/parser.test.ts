import { describe, expect, it } from "vitest";
import { parseJobPost } from "../src/index";

describe("parseJobPost", () => {
  it("extracts time, rate, perks, and date", () => {
    const text = "Нужен сотрудник завтра с 10 до 19, 600₽/час, питание и такси";
    const result = parseJobPost(text, new Date("2024-06-01"));

    expect(result.timeRange.value).toBe("10:00-19:00");
    expect(result.rate.value).toBe("600");
    expect(result.perks).toContain("food");
    expect(result.perks).toContain("taxi");
    expect(result.date.value).toBe("2024-06-02");
  });

  it("flags risk keywords", () => {
    const result = parseJobPost("Нужна предоплата, скинь фото карты");
    expect(result.riskFlags.length).toBeGreaterThan(0);
  });
});
