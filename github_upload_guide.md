# Как загрузить проект на GitHub

Так как команда `git` не была найдена в вашей системе, вам нужно сначала установить Git.

## Шаг 1: Установка Git
1. Скачайте установщик Git для Windows: [git-scm.com/download/win](https://git-scm.com/download/win).
2. Запустите его и установите (можно оставлять все настройки по умолчанию).
3. Перезагрузите терминал или VS Code, чтобы команда стала доступна.

## Шаг 2: Создание репозитория на GitHub
1. Зайдите на [github.com](https://github.com/) и войдите в аккаунт.
2. Нажмите кнопку **"New"** (Создать репозиторий).
3. Введите название (например, `vtb-webapp-bot`).
4. Нажмите **"Create repository"**.
5. Скопируйте ссылку на ваш репозиторий (она выглядит как `https://github.com/ВАШ_ЛОГИН/vtb-webapp-bot.git`).

## Шаг 3: Загрузка проекта через терминал (PowerShell)
Откройте терминал в папке проекта (`C:\Users\Администратор\Desktop\vtbwebapp`) и выполните команды по очереди:

1. **Инициализация:**
   ```powershell
   git init
   ```
2. **Добавление файлов:**
   ```powershell
   git add .
   ```
3. **Первый коммит:**
   ```powershell
   git commit -m "Initial commit"
   ```
4. **Настройка ветки:**
   ```powershell
   git branch -M main
   ```
5. **Привязка к GitHub:**
   *(Замените ССЫЛКУ на ту, которую вы скопировали)*
   ```powershell
   git remote add origin ССЫЛКА
   ```
6. **Отправка файлов:**
   ```powershell
   git push -u origin main
   ```

---

## Альтернативный способ (через GitHub Desktop)
Если вы не хотите пользоваться командами:
1. Скачайте [GitHub Desktop](https://desktop.github.com/).
2. Выберите **"Add Existing Repository"** и укажите папку `C:\Users\Администратор\Desktop\vtbwebapp`.
3. Нажмите **"Publish repository"**.
