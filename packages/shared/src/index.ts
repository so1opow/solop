import { z } from "zod";

export const WorkspaceType = z.enum(["SOLO", "FAMILY", "CREW", "GROUP"]);
export type WorkspaceType = z.infer<typeof WorkspaceType>;

export const WorkspaceSchema = z.object({
  id: z.string(),
  type: WorkspaceType,
  title: z.string(),
  ownerUserId: z.string(),
  linkedChatId: z.string().nullable().optional(),
  createdAt: z.string()
});

export const MembershipRole = z.enum(["OWNER", "MEMBER", "VIEWER"]);
export type MembershipRole = z.infer<typeof MembershipRole>;

export const JobPostStatus = z.enum(["NEW", "ANALYZED", "SAVED"]);
export type JobPostStatus = z.infer<typeof JobPostStatus>;

export const ShiftStatus = z.enum(["PAID", "PENDING", "OVERDUE"]);
export type ShiftStatus = z.infer<typeof ShiftStatus>;

export const PerksSchema = z.object({
  food: z.boolean().default(false),
  taxi: z.boolean().default(false),
  instantPay: z.boolean().default(false)
});
export type Perks = z.infer<typeof PerksSchema>;

export const ShiftSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  breakMin: z.number(),
  rate: z.number(),
  perks: PerksSchema,
  status: ShiftStatus,
  organizer: z.string(),
  location: z.string().nullable().optional(),
  sourceJobPostId: z.string().nullable().optional(),
  createdAt: z.string()
});

export type Shift = z.infer<typeof ShiftSchema>;

export const JobPostSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  tgChatId: z.string(),
  tgMessageId: z.string(),
  authorTgUserId: z.string().nullable().optional(),
  text: z.string(),
  status: JobPostStatus,
  extracted: z.record(z.unknown()).nullable().optional(),
  createdAt: z.string()
});

export const ExtractedFieldSchema = z.object({
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1)
});

export const ExtractedJobSchema = z.object({
  organizer: ExtractedFieldSchema,
  date: ExtractedFieldSchema,
  timeRange: ExtractedFieldSchema,
  rate: ExtractedFieldSchema,
  payType: ExtractedFieldSchema,
  perks: z.array(z.string()),
  location: ExtractedFieldSchema,
  riskFlags: z.array(z.string())
});

export type ExtractedJob = z.infer<typeof ExtractedJobSchema>;

const moneyRegex = /(₽|rub|руб|р\b)\s?(\d{1,3}(?:[\s,.]\d{3})*|\d+)(?:\s?к|k)?/i;
const rateRegex = /(\d{2,5})\s?(?:₽|rub|руб|р)\s?\/?\s?(?:час|h|hour)/i;
const timeRangeRegex = /(\d{1,2})(?::(\d{2}))?\s?(?:-|—|–|до)\s?(\d{1,2})(?::(\d{2}))?/i;
const dateRegex = /(\d{1,2})[./](\d{1,2})/;
const englishDateRegex = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s?(\d{1,2})/i;

const perkMap: Record<string, string> = {
  питание: "food",
  food: "food",
  такси: "taxi",
  taxi: "taxi",
  сразу: "instantPay",
  instant: "instantPay",
  аванс: "instantPay"
};

const riskKeywords = ["предоплата", "паспорт", "карты", "скинь фото", "фото карты", "перевод заранее"]; 

export function parseJobPost(text: string, now = new Date()): ExtractedJob {
  const lower = text.toLowerCase();
  const perks = Object.entries(perkMap)
    .filter(([key]) => lower.includes(key))
    .map(([, value]) => value);

  const riskFlags = riskKeywords.filter((keyword) => lower.includes(keyword));

  let rateValue: string | null = null;
  let rateConfidence = 0.1;
  const rateMatch = lower.match(rateRegex);
  if (rateMatch) {
    rateValue = rateMatch[1];
    rateConfidence = 0.9;
  } else {
    const moneyMatch = lower.match(moneyRegex);
    if (moneyMatch) {
      rateValue = moneyMatch[2].replace(/\s/g, "");
      rateConfidence = 0.5;
    }
  }

  let timeValue: string | null = null;
  let timeConfidence = 0.1;
  const timeMatch = lower.match(timeRangeRegex);
  if (timeMatch) {
    const start = `${timeMatch[1].padStart(2, "0")}:${(timeMatch[2] ?? "00").padStart(2, "0")}`;
    const end = `${timeMatch[3].padStart(2, "0")}:${(timeMatch[4] ?? "00").padStart(2, "0")}`;
    timeValue = `${start}-${end}`;
    timeConfidence = 0.8;
  }

  let dateValue: string | null = null;
  let dateConfidence = 0.1;
  const dateMatch = lower.match(dateRegex);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, "0");
    const month = dateMatch[2].padStart(2, "0");
    dateValue = `${now.getFullYear()}-${month}-${day}`;
    dateConfidence = 0.7;
  } else {
    const englishMatch = lower.match(englishDateRegex);
    if (englishMatch) {
      const monthMap = [
        "jan",
        "feb",
        "mar",
        "apr",
        "may",
        "jun",
        "jul",
        "aug",
        "sep",
        "oct",
        "nov",
        "dec"
      ];
      const monthIndex = monthMap.indexOf(englishMatch[1].toLowerCase());
      if (monthIndex >= 0) {
        const day = englishMatch[2].padStart(2, "0");
        const month = String(monthIndex + 1).padStart(2, "0");
        dateValue = `${now.getFullYear()}-${month}-${day}`;
        dateConfidence = 0.6;
      }
    }
  }

  const dateTokens = ["today", "сегодня", "tomorrow", "завтра"];
  const dateToken = dateTokens.find((token) => lower.includes(token));
  if (dateToken) {
    const adjust = dateToken === "tomorrow" || dateToken === "завтра" ? 1 : 0;
    const date = new Date(now);
    date.setDate(now.getDate() + adjust);
    dateValue = date.toISOString().slice(0, 10);
    dateConfidence = 0.8;
  }

  return {
    organizer: {
      value: null,
      confidence: 0
    },
    date: {
      value: dateValue,
      confidence: dateConfidence
    },
    timeRange: {
      value: timeValue,
      confidence: timeConfidence
    },
    rate: {
      value: rateValue,
      confidence: rateConfidence
    },
    payType: {
      value: lower.includes("нал") ? "cash" : lower.includes("перевод") ? "transfer" : null,
      confidence: lower.includes("нал") || lower.includes("перевод") ? 0.6 : 0.1
    },
    perks: Array.from(new Set(perks)),
    location: {
      value: null,
      confidence: 0
    },
    riskFlags
  };
}

export type ShiftSummary = {
  totalEarnings: number;
  totalHours: number;
  totalShifts: number;
};

export function aggregateShifts(
  shifts: Array<Pick<Shift, "date" | "startTime" | "endTime" | "breakMin" | "rate">>
): ShiftSummary {
  let totalHours = 0;
  let totalEarnings = 0;
  for (const shift of shifts) {
    const [startH, startM] = shift.startTime.split(":").map(Number);
    const [endH, endM] = shift.endTime.split(":").map(Number);
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;
    const durationMin = Math.max(0, end - start - shift.breakMin);
    const hours = durationMin / 60;
    totalHours += hours;
    totalEarnings += hours * shift.rate;
  }
  return {
    totalEarnings: Math.round(totalEarnings),
    totalHours: Math.round(totalHours * 10) / 10,
    totalShifts: shifts.length
  };
}

export function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(base64, "base64").toString();
}
