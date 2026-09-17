terraform {
  required_version = ">= 1.5.0"
  required_providers {
    yandex = {
      source  = "yandex-cloud/yandex"
      version = ">= 0.130.0"
    }
  }
}

provider "yandex" {
  cloud_id                 = var.cloud_id
  folder_id                 = var.folder_id
  zone                      = var.zone
  # Auth: run `yc init` locally first (or set YC_TOKEN / YC_SERVICE_ACCOUNT_KEY_FILE
  # env vars) — see docs/DEPLOY_CHECKLIST.md. Do not hardcode credentials here.
  storage_access_key       = yandex_iam_service_account_static_access_key.storage.access_key
  storage_secret_key       = yandex_iam_service_account_static_access_key.storage.secret_key
}
