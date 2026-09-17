output "api_gateway_url" {
  description = "Base URL to set as API_BASE in frontend/assets/js/api.js"
  value       = yandex_api_gateway.api.domain
}

output "storage_website_endpoint" {
  description = "Object Storage static website endpoint (CDN origin)"
  value       = yandex_storage_bucket.site.website_endpoint
}

output "cdn_cname" {
  description = "CNAME target to point the domain at (if managing DNS outside Yandex Cloud)"
  value       = yandex_cdn_resource.site.cname
}

output "certificate_challenges" {
  description = "DNS validation records required to issue the TLS certificate — add these at your DNS provider"
  value       = yandex_cm_certificate.site.challenges
}

output "ydb_endpoint" {
  value = yandex_ydb_database_serverless.db.ydb_api_endpoint
}

output "ydb_database" {
  value = yandex_ydb_database_serverless.db.database_path
}
