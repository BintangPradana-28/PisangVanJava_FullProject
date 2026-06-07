# infra/cloudflare/outputs.tf

output "dns_apex_record_id" {
  description = "Cloudflare DNS record ID untuk apex domain (@)"
  value       = cloudflare_record.apex.id
}

output "dns_www_record_id" {
  description = "Cloudflare DNS record ID untuk www subdomain"
  value       = cloudflare_record.www.id
}

output "waf_webhook_ruleset_id" {
  description = "ID WAF ruleset untuk webhook IP protection"
  value       = cloudflare_ruleset.pvj_waf_webhook.id
}

output "ssl_mode" {
  description = "SSL mode aktif (harus 'strict')"
  value       = "strict"
}
