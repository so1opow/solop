import "dotenv/config";
import cors from "cors";
import crypto from "crypto";
import express from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { aggregateShifts } from "@zavod/shared";
import { z } from "zod";

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET ?? "dev_secret";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const ADMIN_KEY = process.env.API_ADMIN_KEY ?? "dev_admin";

function verifyTelegramInitData(initData: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;
  params.delete("hash");
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = crypto.createHash("sha256").update(TELEGRAM_BOT_TOKEN).digest();
  const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  return hmac === hash;
}

function getUserFromInitData(initData: string) {
  const params = new URLSearchParams(initData);
  const userRaw = params.get("user");
  if (!userRaw) return null;
  return JSON.parse(userRaw) as {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
}

async function upsertUserFromTelegram(tgUser: { id: number; username?: string; first_name?: string; last_name?: string }) {
  return prisma.user.upsert({
    where: { id: String(tgUser.id) },
    update: {
      tgUserId: String(tgUser.id),
      username: tgUser.username,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name
    },
    create: {
      id: String(tgUser.id),
      tgUserId: String(tgUser.id),
      username: tgUser.username,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name
    }
  });
}

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing authorization" });
  const token = header.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    (req as any).userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function adminMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.headers["x-admin-key"] !== ADMIN_KEY) {
    return res.status(401).json({ error: "Invalid admin key" });
  }
  return next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/auth/telegram", async (req, res) => {
  const schema = z.object({ initData: z.string() });
  const { initData } = schema.parse(req.body);
  if (!verifyTelegramInitData(initData)) {
    return res.status(401).json({ error: "Invalid initData" });
  }
  const user = getUserFromInitData(initData);
  if (!user) return res.status(400).json({ error: "Missing user" });
  const dbUser = await upsertUserFromTelegram(user);
  const token = jwt.sign({ sub: dbUser.id }, JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token, user: dbUser });
});

app.get("/workspaces", authMiddleware, async (req, res) => {
  const userId = (req as any).userId as string;
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { workspace: true }
  });
  res.json(memberships.map((membership) => membership.workspace));
});

app.post("/workspaces", authMiddleware, async (req, res) => {
  const schema = z.object({ title: z.string(), type: z.enum(["SOLO", "FAMILY", "CREW", "GROUP"]) });
  const { title, type } = schema.parse(req.body);
  const userId = (req as any).userId as string;
  const workspace = await prisma.workspace.create({
    data: {
      title,
      type,
      ownerUserId: userId,
      memberships: {
        create: {
          userId,
          role: "OWNER"
        }
      }
    }
  });
  res.json(workspace);
});

app.post("/invites", authMiddleware, async (req, res) => {
  const schema = z.object({ workspaceId: z.string() });
  const { workspaceId } = schema.parse(req.body);
  const userId = (req as any).userId as string;
  const code = crypto.randomBytes(3).toString("hex");
  const invite = await prisma.invite.create({
    data: {
      code,
      workspaceId,
      createdById: userId
    }
  });
  res.json(invite);
});

app.post("/invites/accept", authMiddleware, async (req, res) => {
  const schema = z.object({ code: z.string() });
  const { code } = schema.parse(req.body);
  const userId = (req as any).userId as string;
  const invite = await prisma.invite.findUnique({ where: { code } });
  if (!invite) return res.status(404).json({ error: "Invite not found" });
  const membership = await prisma.membership.upsert({
    where: {
      workspaceId_userId: { workspaceId: invite.workspaceId, userId }
    },
    update: {},
    create: {
      workspaceId: invite.workspaceId,
      userId,
      role: "MEMBER"
    }
  });
  res.json(membership);
});

app.get("/memberships/:workspaceId", authMiddleware, async (req, res) => {
  const { workspaceId } = req.params;
  const memberships = await prisma.membership.findMany({
    where: { workspaceId },
    include: { user: true }
  });
  res.json(memberships);
});

app.get("/job-posts", authMiddleware, async (req, res) => {
  const schema = z.object({ workspaceId: z.string() });
  const { workspaceId } = schema.parse(req.query);
  const posts = await prisma.jobPost.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" }
  });
  res.json(posts);
});

app.get("/job-posts/:id", authMiddleware, async (req, res) => {
  const post = await prisma.jobPost.findUnique({ where: { id: req.params.id } });
  if (!post) return res.status(404).json({ error: "Not found" });
  res.json(post);
});

app.patch("/job-posts/:id", authMiddleware, async (req, res) => {
  const schema = z.object({ status: z.string().optional(), extractedJson: z.any().optional() });
  const body = schema.parse(req.body);
  const post = await prisma.jobPost.update({ where: { id: req.params.id }, data: body });
  res.json(post);
});

app.post("/shifts", authMiddleware, async (req, res) => {
  const schema = z.object({
    workspaceId: z.string(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    breakMin: z.number(),
    rate: z.number(),
    perks: z.object({ food: z.boolean(), taxi: z.boolean(), instantPay: z.boolean() }),
    status: z.string(),
    organizer: z.string(),
    location: z.string().optional(),
    sourceJobPostId: z.string().optional()
  });
  const data = schema.parse(req.body);
  const userId = (req as any).userId as string;
  const shift = await prisma.shift.create({
    data: {
      workspaceId: data.workspaceId,
      userId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      breakMin: data.breakMin,
      rate: data.rate,
      perksJson: data.perks,
      status: data.status,
      organizer: data.organizer,
      location: data.location,
      sourceJobPostId: data.sourceJobPostId
    }
  });
  res.json(shift);
});

app.get("/shifts", authMiddleware, async (req, res) => {
  const schema = z.object({ workspaceId: z.string() });
  const { workspaceId } = schema.parse(req.query);
  const shifts = await prisma.shift.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" }
  });
  res.json(shifts);
});

app.patch("/shifts/:id", authMiddleware, async (req, res) => {
  const schema = z.object({
    date: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    breakMin: z.number().optional(),
    rate: z.number().optional(),
    perksJson: z.any().optional(),
    status: z.string().optional(),
    organizer: z.string().optional(),
    location: z.string().optional()
  });
  const data = schema.parse(req.body);
  const shift = await prisma.shift.update({ where: { id: req.params.id }, data });
  res.json(shift);
});

app.get("/stats/:workspaceId", authMiddleware, async (req, res) => {
  const workspaceId = req.params.workspaceId;
  const shifts = await prisma.shift.findMany({ where: { workspaceId } });
  const overall = aggregateShifts(
    shifts.map((shift) => ({
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakMin: shift.breakMin,
      rate: shift.rate
    }))
  );
  const memberMap = new Map<string, typeof overall>();
  for (const shift of shifts) {
    const summary = aggregateShifts([
      {
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakMin: shift.breakMin,
        rate: shift.rate
      }
    ]);
    const current = memberMap.get(shift.userId) ?? { totalEarnings: 0, totalHours: 0, totalShifts: 0 };
    memberMap.set(shift.userId, {
      totalEarnings: current.totalEarnings + summary.totalEarnings,
      totalHours: Math.round((current.totalHours + summary.totalHours) * 10) / 10,
      totalShifts: current.totalShifts + summary.totalShifts
    });
  }
  const perMember = Array.from(memberMap.entries()).map(([userId, summary]) => ({ userId, ...summary }));
  res.json({ overall, perMember });
});

app.post("/share", authMiddleware, async (req, res) => {
  const schema = z.object({ workspaceId: z.string(), message: z.string() });
  const { workspaceId, message } = schema.parse(req.body);
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace?.linkedChatId) return res.status(400).json({ error: "No linked chat" });
  if (!TELEGRAM_BOT_TOKEN) return res.status(500).json({ error: "Bot token missing" });
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: workspace.linkedChatId, text: message })
  });
  res.json({ ok: true });
});

app.post("/bot/workspaces", adminMiddleware, async (req, res) => {
  const schema = z.object({
    title: z.string(),
    type: z.enum(["SOLO", "FAMILY", "CREW", "GROUP"]),
    tgUser: z.object({ id: z.number(), username: z.string().optional(), first_name: z.string().optional(), last_name: z.string().optional() })
  });
  const { title, type, tgUser } = schema.parse(req.body);
  const user = await upsertUserFromTelegram(tgUser);
  const workspace = await prisma.workspace.create({
    data: {
      title,
      type,
      ownerUserId: user.id,
      memberships: { create: { userId: user.id, role: "OWNER" } }
    }
  });
  res.json(workspace);
});

app.post("/bot/invites/accept", adminMiddleware, async (req, res) => {
  const schema = z.object({ code: z.string(), tgUser: z.object({ id: z.number(), username: z.string().optional() }) });
  const { code, tgUser } = schema.parse(req.body);
  const user = await upsertUserFromTelegram(tgUser);
  const invite = await prisma.invite.findUnique({ where: { code } });
  if (!invite) return res.status(404).json({ error: "Invite not found" });
  const membership = await prisma.membership.upsert({
    where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: user.id } },
    update: {},
    create: { workspaceId: invite.workspaceId, userId: user.id, role: "MEMBER" }
  });
  res.json(membership);
});

app.post("/bot/workspaces/link", adminMiddleware, async (req, res) => {
  const schema = z.object({ workspaceId: z.string(), chatId: z.string() });
  const { workspaceId, chatId } = schema.parse(req.body);
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { linkedChatId: chatId, type: "GROUP" }
  });
  res.json(workspace);
});

app.post("/bot/job-posts", adminMiddleware, async (req, res) => {
  const schema = z.object({
    workspaceId: z.string(),
    tgChatId: z.string(),
    tgMessageId: z.string(),
    authorTgUserId: z.string().optional(),
    text: z.string()
  });
  const data = schema.parse(req.body);
  const post = await prisma.jobPost.create({
    data: {
      workspaceId: data.workspaceId,
      tgChatId: data.tgChatId,
      tgMessageId: data.tgMessageId,
      authorTgUserId: data.authorTgUserId,
      text: data.text,
      status: "NEW"
    }
  });
  res.json(post);
});

app.post("/bot/job-posts/:id/analyze", adminMiddleware, async (req, res) => {
  const schema = z.object({ extractedJson: z.any() });
  const { extractedJson } = schema.parse(req.body);
  const post = await prisma.jobPost.update({
    where: { id: req.params.id },
    data: { status: "ANALYZED", extractedJson }
  });
  res.json(post);
});

app.get("/bot/job-posts/:id", adminMiddleware, async (req, res) => {
  const post = await prisma.jobPost.findUnique({ where: { id: req.params.id } });
  if (!post) return res.status(404).json({ error: "Not found" });
  res.json(post);
});

app.get("/bot/workspaces/by-chat", adminMiddleware, async (req, res) => {
  const schema = z.object({ chatId: z.string() });
  const { chatId } = schema.parse(req.query);
  const workspace = await prisma.workspace.findFirst({ where: { linkedChatId: chatId } });
  res.json(workspace ?? null);
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(PORT, () => {
  console.log(`API listening on ${PORT}`);
});
