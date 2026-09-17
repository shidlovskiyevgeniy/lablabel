# lablabel.ru

Сайт для продажи персонализированных 3D-печатных фишек-спиннеров с NFC-меткой
и QR-кодом на VK/Telegram. Самозанятый (НПД), эквайринг — ЮKassa.

## Структура

```
frontend/   статический сайт (лендинг, каталог, товар, корзина, кабинет, юр. страницы)
            — без сборки, деплоится как есть в Object Storage
backend/    Yandex Cloud Functions (Node.js): каталог, auth по коду на почту,
            заказы, создание платежа, webhook ЮKassa
backend/ydb/schema.sql   схема таблиц YDB
infra/      Terraform: Object Storage + CDN, TLS, YDB, Cloud Functions, API Gateway
docs/       чеклист развёртывания и заметки
```

## Быстрый старт

См. [docs/DEPLOY_CHECKLIST.md](docs/DEPLOY_CHECKLIST.md) — пошаговый чеклист
от установки `yc`/`terraform` до сквозного теста заказа.

## Архитектура

- Фронтенд — чистый HTML/CSS/JS без фреймворка и сборки: 3 товара в каталоге
  (`frontend/assets/data/products.json`), персонализация на странице товара
  (ссылка VK/Telegram, цвет, комментарий), корзина в `localStorage`, оформление
  заказа и оплата — через API.
- Бэкенд — 7 Cloud Functions за одним API Gateway: `/catalog`, `/auth/request-code`,
  `/auth/verify-code`, `/orders`, `/orders/me`, `/orders/{id}/pay`, `/payments/webhook`.
  Цены на заказ пересчитываются на сервере (`backend/lib/catalog.js`) — клиенту
  нельзя подменить цену.
- Данные — YDB (serverless): `users`, `auth_codes`, `orders`, `order_items`.
- Личный кабинет — без пароля: код на почту → JWT-сессия в `localStorage`.
- Оплата — ЮKassa, `payment-webhook` не доверяет телу вебхука напрямую и
  перезапрашивает статус платежа по API перед тем как пометить заказ оплаченным.
- Чек для «Мой налог» — на MVP выдаётся вручную после каждой продажи (см. чеклист).

## Важно перед публикацией

- Заполнить реквизиты в `frontend/legal/contacts.html` и `frontend/legal/oferta.html`
  (сейчас там плейсхолдеры `{{...}}`).
- Проверить оферту и условия возврата с юристом.
- Код backend/lib/ydb.js и infra/*.tf не выполнялись в этой среде (нет доступа
  к вашему Yandex Cloud) — при первом `terraform apply` / `npm install`
  возможны мелкие несостыковки с текущими версиями SDK/провайдера, см. конец
  чеклиста.
