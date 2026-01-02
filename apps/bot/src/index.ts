import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";
import { base64UrlEncode, parseJobPost } from "@zavod/shared";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3001";
const API_ADMIN_KEY = process.env.API_ADMIN_KEY ?? "dev_admin";
const WEBAPP_URL = process.env.WEBAPP_URL ?? "http://localhost:5173";

if (!BOT_TOKEN) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

const bot = new Bot(BOT_TOKEN);

async function apiRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": API_ADMIN_KEY,
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }
  return response.json();
}

bot.command("start", async (ctx) => {
  const keyboard = new InlineKeyboard().webApp("Open Zavodnoy Kaban", WEBAPP_URL);
  await ctx.reply("⚡ Заводной Кабан: быстрые смены и статистика.", { reply_markup: keyboard });
});

bot.command("create_workspace", async (ctx) => {
  if (ctx.chat.type !== "private") return;
  const title = ctx.message?.text?.replace("/create_workspace", "").trim() || "My Crew";
  const tgUser = {
    id: ctx.from.id,
    username: ctx.from.username,
    first_name: ctx.from.first_name,
    last_name: ctx.from.last_name
  };
  const workspace = await apiRequest("/bot/workspaces", {
    method: "POST",
    body: JSON.stringify({ title, type: "FAMILY", tgUser })
  });
  await ctx.reply(`Workspace created: ${workspace.title}\nID: ${workspace.id}`);
});

bot.command("invite", async (ctx) => {
  if (ctx.chat.type !== "private") return;
  const parts = ctx.message?.text?.split(" ") ?? [];
  const code = parts[1];
  if (!code) {
    await ctx.reply("Usage: /invite <code>");
    return;
  }
  const tgUser = { id: ctx.from.id, username: ctx.from.username };
  await apiRequest("/bot/invites/accept", {
    method: "POST",
    body: JSON.stringify({ code, tgUser })
  });
  await ctx.reply("Invite accepted. Open the mini app to continue.");
});

bot.command("link", async (ctx) => {
  if (ctx.chat.type === "private") {
    await ctx.reply("Use /link <workspaceId> in the group chat.");
    return;
  }
  const parts = ctx.message?.text?.split(" ") ?? [];
  const workspaceId = parts[1];
  if (!workspaceId) {
    await ctx.reply("Usage: /link <workspaceId>");
    return;
  }
  await apiRequest("/bot/workspaces/link", {
    method: "POST",
    body: JSON.stringify({ workspaceId, chatId: String(ctx.chat.id) })
  });
  await ctx.reply("Group linked! I will ingest new job posts here.");
});

bot.on("message:text", async (ctx) => {
  if (ctx.message?.text?.startsWith("/")) return;
  if (ctx.chat.type === "private") return;
  const workspace = await apiRequest(`/bot/workspaces/by-chat?chatId=${ctx.chat.id}`);
  if (!workspace) return;
  const post = await apiRequest("/bot/job-posts", {
    method: "POST",
    body: JSON.stringify({
      workspaceId: workspace.id,
      tgChatId: String(ctx.chat.id),
      tgMessageId: String(ctx.message.message_id),
      authorTgUserId: ctx.from?.id ? String(ctx.from.id) : undefined,
      text: ctx.message.text
    })
  });
  const keyboard = new InlineKeyboard()
    .text("Analyze", `analyze:${post.id}`)
    .text("Create shift", `create:${post.id}`)
    .text("Ignore", `ignore:${post.id}`);
  await ctx.reply("New job post saved.", { reply_markup: keyboard });
});

bot.callbackQuery(/analyze:(.+)/, async (ctx) => {
  const postId = ctx.match[1];
  const post = await apiRequest(`/bot/job-posts/${postId}`);
  const extracted = parseJobPost(post.text);
  await apiRequest(`/bot/job-posts/${postId}/analyze`, {
    method: "POST",
    body: JSON.stringify({ extractedJson: extracted })
  });
  const chips = [
    extracted.date.value ? `📅 ${extracted.date.value}` : null,
    extracted.timeRange.value ? `⏰ ${extracted.timeRange.value}` : null,
    extracted.rate.value ? `💸 ${extracted.rate.value}` : null,
    extracted.perks.length ? `✨ ${extracted.perks.join(", ")}` : null
  ].filter(Boolean);
  const startapp = base64UrlEncode(JSON.stringify({ workspaceId: post.workspaceId, jobPostId: post.id }));
  const keyboard = new InlineKeyboard().url("Open Mini App", `${WEBAPP_URL}?startapp=${startapp}`);
  await ctx.editMessageText(`Analyzed: ${chips.join(" ") || "No data"}\nOpen mini app to confirm.`, {
    reply_markup: keyboard
  });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery(/create:(.+)/, async (ctx) => {
  const postId = ctx.match[1];
  const post = await apiRequest(`/bot/job-posts/${postId}`);
  const startapp = base64UrlEncode(JSON.stringify({ workspaceId: post.workspaceId, jobPostId: post.id }));
  const keyboard = new InlineKeyboard().url("Create shift", `${WEBAPP_URL}?startapp=${startapp}`);
  await ctx.editMessageText("Open the mini app to create a shift.", { reply_markup: keyboard });
  await ctx.answerCallbackQuery();
});

bot.callbackQuery(/ignore:(.+)/, async (ctx) => {
  await ctx.editMessageText("Ignored.");
  await ctx.answerCallbackQuery();
});

bot.start();
