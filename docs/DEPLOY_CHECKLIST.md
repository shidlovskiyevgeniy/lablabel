# Чеклист развёртывания lablabel.ru на Yandex Cloud

Код собран (статический фронтенд + Cloud Functions + Terraform), но сам деплой
нужно выполнить у себя: в этой среде нет `git`, `yc` CLI и доступа к вашему
аккаунту Yandex Cloud / домену.

## 0. Инструменты (один раз)

```bash
# Terraform
winget install Hashicorp.Terraform

# Yandex Cloud CLI
irm https://storage.yandexcloud.net/yandexcloud-yc/install.ps1 | iex

# Node.js уже установлен (проверено: v24)
```

```bash
yc init
```
Авторизуется в вашем аккаунте, выберет/создаст облако и каталог (folder).
Запишите `cloud_id` и `folder_id` (`yc config list`) — понадобятся для
`infra/terraform.tfvars`.

## 1. ЮKassa

1. Зарегистрируйтесь как самозанятый на yookassa.ru (понадобится ИНН, привязанный
   к статусу НПД в приложении «Мой налог»).
2. В личном кабинете ЮKassa создайте магазин → возьмите `shopId` и `Секретный ключ`.
3. Впишите в `infra/terraform.tfvars` (`yookassa_shop_id`, `yookassa_secret_key`).
4. После деплоя (шаг 5) пропишите в настройках магазина ЮKassa URL для
   уведомлений (webhook): `https://<api_gateway_url>/payments/webhook`
   (значение `api_gateway_url` — в выводе `terraform output` после apply).

## 2. Почта (для кода входа и уведомлений о заказах)

Нужен SMTP-аккаунт для отправки писем. Проще всего — почта на своём домене
через Яндекс 360 для бизнеса (бесплатно для 1 пользователя), либо готовый
SMTP-логин/пароль любого провайдера транзакционной почты.

Впишите в `terraform.tfvars`: `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `mail_from`.

## 3. DNS домена

Уточните, где сейчас управляется DNS для **lablabel.ru** (у регистратора, где
покупали домен). Два варианта:

- **Проще**: оставить DNS у регистратора, `manage_dns = false` в tfvars.
  После `terraform apply` возьмите значение `cdn_cname` из outputs и создайте
  у регистратора запись `CNAME lablabel.ru → <cdn_cname>` (либо `ALIAS`/`ANAME`,
  если регистратор не поддерживает CNAME на apex-домене — тогда см. его
  документацию по "flattening").
- **Через Yandex Cloud DNS**: `manage_dns = true`, затем после apply — делегировать
  NS-записи домена на Yandex Cloud (значения — `yc dns zone get lablabel-ru-zone`).

Для выпуска TLS-сертификата (Certificate Manager, DNS-валидация) после
`terraform apply` посмотрите `terraform output certificate_challenges` и
добавьте указанные там CNAME-записи у себя в DNS — без них сертификат не
подтвердится и CDN не будет отдавать HTTPS.

## 4. Заполнить юридические данные

В `frontend/legal/contacts.html` и `frontend/legal/oferta.html` замените
плейсхолдеры `{{ФИО самозанятого}}`, `{{ИНН}}`, `{{адрес}}`, `{{email}}`,
`{{телефон}}` реальными данными. Рекомендуем также показать черновик оферты
юристу перед публикацией.

## 5. Развернуть инфраструктуру

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
# отредактировать terraform.tfvars — вписать значения из шагов 0-2

terraform init
terraform apply
```

Terraform создаст: бакет Object Storage + зальёт файлы из `frontend/`, CDN,
сертификат TLS, YDB (serverless), 7 Cloud Functions, API Gateway.

**Перед первым apply нужно собрать `backend.zip`** (Terraform по умолчанию
ищет его в `../backend.zip`):

```bash
cd backend
npm install
cd ..
Compress-Archive -Path backend\* -DestinationPath backend.zip -Force
```

Пересобирайте `backend.zip` и делайте `terraform apply` заново при каждом
изменении кода функций.

## 6. Создать таблицы в YDB

```bash
yc ydb sql --database=$(terraform -chdir=infra output -raw ydb_database) \
  --execute-file=backend/ydb/schema.sql
```

## 7. Прописать API_BASE во фронтенде

```bash
terraform -chdir=infra output api_gateway_url
```

Откройте `frontend/assets/js/api.js` и замените `https://REPLACE-ME.apigw.yandexcloud.net`
на реальный адрес API Gateway (формат `https://<id>.apigw.yandexcloud.net`).
Затем пересоберите и перезалейте фронтенд:

```bash
cd infra
terraform apply   # подхватит изменившийся api.js через etag = filemd5(...)
```

## 8. Сквозной тест заказа

1. Откройте `https://lablabel.ru/catalog.html`, выберите товар, укажите ссылку
   VK/Telegram, добавьте в корзину.
2. Оформите заказ тестовой картой ЮKassa (тестовый режим магазина, номера
   тестовых карт — в документации ЮKassa).
3. Проверьте: письмо с кодом входа приходит; после оплаты письмо о заказе
   приходит и вам, и покупателю; заказ появляется в `/cabinet.html` со
   статусом «Оплачен».
4. После реальной продажи — вручную выбейте чек в приложении «Мой налог» (не
   позднее 9-го числа следующего месяца), пока это не автоматизировано.

## Что не автоматизировано на MVP (сознательно)

- Выдача чеков в «Мой налог» — вручную после каждой продажи.
- Смена статуса заказа «В изготовлении → Отправлен» — вручную (нет админки);
  при росте объёма можно добавить простую admin-функцию с обновлением статуса
  и трек-номера.
- Проверка лимита дохода самозанятого (2,4 млн ₽/год) — считайте отдельно, сайт
  этого не отслеживает.

## Если что-то в Terraform/ydb-sdk не собирается один в один

Код написан по документированному API Yandex Cloud Terraform-провайдера и
`ydb-sdk`, но не запускался в этой среде (нет доступа к вашему облаку и к
npm-реестру для установки зависимостей). При `terraform apply` / `npm install`
возможны небольшие расхождения с текущими версиями — тогда ориентируйтесь на
сообщение об ошибке и официальную документацию:
- https://yandex.cloud/ru/docs/functions/
- https://yandex.cloud/ru/docs/ydb/
- https://registry.terraform.io/providers/yandex-cloud/yandex/latest/docs
