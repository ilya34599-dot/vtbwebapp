# Мануал по деплою проекта на Vercel

Этот проект представляет собой Telegram-бота на Node.js, оптимизированного для работы с Vercel Serverless Functions.

## 1. Подготовка
Перед началом убедитесь, что у вас есть:
- Аккаунт на [GitHub](https://github.com/).
- Аккаунт на [Vercel](https://vercel.com/).
- Установленный [Git](https://git-scm.com/) на компьютере.

## 2. Загрузка проекта в GitHub
1. Создайте новый репозиторий на GitHub.
2. В папке проекта выполните команды:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/ВАШ_ЛОГИН/НАЗВАНИЕ_РЕПОЗИТОРИЯ.git
   git push -u origin main
   ```

## 3. Деплой на Vercel
1. Зайдите на [Vercel Dashboard](https://vercel.com/dashboard).
2. Нажмите **"Add New"** -> **"Project"**.
3. Импортируйте ваш репозиторий из GitHub.
4. В разделе **"Build & Development Settings"** ничего менять не нужно (Vercel автоматически определит Node.js).
5. Нажмите **"Deploy"**.

## 4. Настройка переменных окружения (Environment Variables)
Для безопасности рекомендуется выносить токены в настройки Vercel, но в текущем проекте они находятся в `api/_lib/config.js`. 

Если вы захотите их обезопасить:
1. В Vercel перейдите в **Settings** -> **Environment Variables**.
2. Добавьте:
   - `BOT_TOKEN`
   - `ADMIN_CHAT_ID`
   - `WORKERS_CHAT_ID`
   - `WEBAPP_URL`
3. Отредактируйте `api/_lib/config.js`, чтобы он читал данные из `process.env`.

## 5. Привязка Webhook для бота
Чтобы бот получал сообщения, нужно сообщить Telegram ваш адрес на Vercel.
После деплоя Vercel даст вам URL (например, `https://vtb-webapp-bot.vercel.app`).

Выполните запрос в браузере или через `curl`:
```
https://api.telegram.org/bot<ВАШ_ТОКЕН>/setWebhook?url=https://<ВАШ_ДОМЕН_VERCEL>/api/app
```
*(Замените `<ВАШ_ТОКЕН>` на токен из @BotFather и `<ВАШ_ДОМЕН_VERCEL>` на ссылку от Vercel).*

## 6. Как обновлять
После того как проект связан с GitHub, любое ваше изменение (команда `git push`) будет автоматически вызывать пересборку (Re-deploy) на Vercel.
