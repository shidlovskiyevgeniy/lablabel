### Service accounts ########################################################

resource "yandex_iam_service_account" "storage" {
  name        = "lablabel-storage-sa"
  description = "Manages the static site Object Storage bucket"
}

resource "yandex_resourcemanager_folder_iam_member" "storage_editor" {
  folder_id = var.folder_id
  role      = "storage.editor"
  member    = "serviceAccount:${yandex_iam_service_account.storage.id}"
}

resource "yandex_iam_service_account_static_access_key" "storage" {
  service_account_id = yandex_iam_service_account.storage.id
  description         = "Static keys for Terraform-managed bucket objects"
}

resource "yandex_iam_service_account" "functions" {
  name        = "lablabel-functions-sa"
  description = "Runs the backend Cloud Functions; has YDB + logging access"
}

resource "yandex_resourcemanager_folder_iam_member" "functions_ydb" {
  folder_id = var.folder_id
  role      = "ydb.editor"
  member    = "serviceAccount:${yandex_iam_service_account.functions.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "functions_logs" {
  folder_id = var.folder_id
  role      = "logging.writer"
  member    = "serviceAccount:${yandex_iam_service_account.functions.id}"
}

### Static site: Object Storage + CDN #######################################

resource "yandex_storage_bucket" "site" {
  bucket = "${replace(var.domain, ".", "-")}-site"
  acl    = "public-read"

  website {
    index_document = "index.html"
    error_document = "index.html"
  }

  depends_on = [yandex_resourcemanager_folder_iam_member.storage_editor]
}

# Uploads every file under frontend/ preserving its relative path. Run
# `terraform apply` again after changing frontend files to re-sync — see
# docs/DEPLOY_CHECKLIST.md.
locals {
  frontend_dir   = "${path.module}/../frontend"
  frontend_files = fileset(local.frontend_dir, "**/*")
  content_types = {
    html = "text/html; charset=utf-8"
    css  = "text/css; charset=utf-8"
    js   = "application/javascript; charset=utf-8"
    json = "application/json; charset=utf-8"
    svg  = "image/svg+xml"
    png  = "image/png"
    jpg  = "image/jpeg"
  }
}

resource "yandex_storage_object" "frontend" {
  for_each     = local.frontend_files
  bucket       = yandex_storage_bucket.site.bucket
  key          = each.value
  source       = "${local.frontend_dir}/${each.value}"
  content_type = lookup(local.content_types, lower(split(".", each.value)[length(split(".", each.value)) - 1]), "application/octet-stream")
  acl          = "public-read"
  etag         = filemd5("${local.frontend_dir}/${each.value}")
}

resource "yandex_cdn_origin_group" "site" {
  name = "lablabel-site-origin"

  origin {
    source = yandex_storage_bucket.site.website_endpoint
  }
}

resource "yandex_cdn_resource" "site" {
  cname             = var.domain
  origin_group_id   = yandex_cdn_origin_group.site.id
  origin_protocol   = "http"
  active             = true

  options {
    edge_cache_settings = 3600
    ssl_certificate_type = "certificate_manager"
    ssl_certificate_id   = yandex_cm_certificate.site.id
  }
}

### TLS certificate ##########################################################

resource "yandex_cm_certificate" "site" {
  name    = "lablabel-site-cert"
  domains = [var.domain, "www.${var.domain}"]

  managed {
    challenge_type = "DNS_CNAME" # follow the DNS validation records Yandex issues after apply
  }
}

### DNS (optional — only if you delegate lablabel.ru's NS to Yandex Cloud) ###

resource "yandex_dns_zone" "site" {
  count       = var.manage_dns ? 1 : 0
  name        = "lablabel-ru-zone"
  zone        = "${var.domain}."
  public      = true
}

resource "yandex_dns_recordset" "cdn_cname" {
  count   = var.manage_dns ? 1 : 0
  zone_id = yandex_dns_zone.site[0].id
  name    = "${var.domain}."
  type    = "CNAME"
  ttl     = 300
  data    = [yandex_cdn_resource.site.cname]
}

### YDB (serverless) ##########################################################

resource "yandex_ydb_database_serverless" "db" {
  name      = "lablabel-db"
  folder_id = var.folder_id
}

### Backend: Cloud Functions #################################################
# All functions share one zip of backend/ (built per docs/DEPLOY_CHECKLIST.md)
# and differ only by entrypoint, so relative requires like
# require('../../lib/ydb') resolve inside the zip regardless of which
# function is invoked.

locals {
  function_env = {
    YDB_ENDPOINT        = yandex_ydb_database_serverless.db.ydb_api_endpoint
    YDB_DATABASE        = yandex_ydb_database_serverless.db.database_path
    JWT_SECRET           = var.jwt_secret
    YOOKASSA_SHOP_ID     = var.yookassa_shop_id
    YOOKASSA_SECRET_KEY = var.yookassa_secret_key
    SMTP_HOST            = var.smtp_host
    SMTP_PORT            = tostring(var.smtp_port)
    SMTP_USER            = var.smtp_user
    SMTP_PASS            = var.smtp_pass
    MAIL_FROM            = var.mail_from
    SELLER_NOTIFY_EMAIL = var.seller_notify_email
    ALLOWED_ORIGIN       = "https://${var.domain}"
    SITE_URL             = "https://${var.domain}"
  }

  functions = {
    catalog          = "functions/catalog/index.handler"
    auth_request     = "functions/auth-request-code/index.handler"
    auth_verify      = "functions/auth-verify-code/index.handler"
    orders_create    = "functions/orders-create/index.handler"
    orders_list      = "functions/orders-list/index.handler"
    payment_create   = "functions/payment-create/index.handler"
    payment_webhook  = "functions/payment-webhook/index.handler"
  }
}

resource "yandex_function" "fn" {
  for_each           = local.functions
  name                = "lablabel-${replace(each.key, "_", "-")}"
  runtime             = "nodejs18"
  entrypoint          = each.value
  memory              = 128
  execution_timeout   = 10
  service_account_id = yandex_iam_service_account.functions.id
  user_hash           = filemd5(var.backend_zip_path)

  content {
    zip_filename = var.backend_zip_path
  }

  environment = local.function_env
}

resource "yandex_function_iam_binding" "public_invoke" {
  for_each    = local.functions
  function_id = yandex_function.fn[each.key].id
  role         = "functions.functionInvoker"
  members      = ["system:allUsers"] # invocation is gated by API Gateway routes, not this IAM binding
}

### API Gateway ###############################################################

resource "yandex_api_gateway" "api" {
  name = "lablabel-api"
  spec = templatefile("${path.module}/api-gateway/openapi.yaml", {
    fn_catalog         = yandex_function.fn["catalog"].id
    fn_auth_request    = yandex_function.fn["auth_request"].id
    fn_auth_verify     = yandex_function.fn["auth_verify"].id
    fn_orders_create   = yandex_function.fn["orders_create"].id
    fn_orders_list     = yandex_function.fn["orders_list"].id
    fn_payment_create  = yandex_function.fn["payment_create"].id
    fn_payment_webhook = yandex_function.fn["payment_webhook"].id
    service_account_id = yandex_iam_service_account.functions.id
  })
}
