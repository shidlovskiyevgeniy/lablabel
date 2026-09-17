variable "cloud_id" {
  description = "Yandex Cloud cloud ID"
  type        = string
}

variable "folder_id" {
  description = "Yandex Cloud folder ID to deploy into"
  type        = string
}

variable "zone" {
  description = "Default availability zone"
  type        = string
  default     = "ru-central1-a"
}

variable "domain" {
  description = "Site domain"
  type        = string
  default     = "lablabel.ru"
}

variable "manage_dns" {
  description = "If true, creates a Yandex Cloud DNS public zone for the domain and NS delegation records must be set at the registrar. If false, you manage DNS at your current registrar and only need the CNAME/A output from this module."
  type        = bool
  default     = false
}

variable "jwt_secret" {
  description = "Secret used to sign session JWTs — generate with `openssl rand -hex 32`"
  type        = string
  sensitive   = true
}

variable "yookassa_shop_id" {
  description = "YooKassa shopId"
  type        = string
  sensitive   = true
}

variable "yookassa_secret_key" {
  description = "YooKassa secret key"
  type        = string
  sensitive   = true
}

variable "smtp_host" {
  description = "SMTP host used to send auth codes and order notifications"
  type        = string
}

variable "smtp_port" {
  description = "SMTP port"
  type        = number
  default     = 465
}

variable "smtp_user" {
  type      = string
  sensitive = true
}

variable "smtp_pass" {
  type      = string
  sensitive = true
}

variable "mail_from" {
  description = "From: address for outgoing mail"
  type        = string
}

variable "seller_notify_email" {
  description = "Where to send 'new paid order' notifications"
  type        = string
}

variable "backend_zip_path" {
  description = "Path to the zipped backend/ directory used by all Cloud Functions (see docs/DEPLOY_CHECKLIST.md for how to build it)"
  type        = string
  default     = "../backend.zip"
}
