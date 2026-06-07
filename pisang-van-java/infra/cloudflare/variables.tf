# infra/cloudflare/variables.tf

variable "cloudflare_api_token" {
  description = "Cloudflare API Token dengan permissions: Zone:Zone:Read, Zone:DNS:Edit, Zone:Firewall Services:Edit, Zone:Zone Settings:Edit"
  type        = string
  sensitive   = true # Tidak akan di-log atau di-print di Terraform output
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID untuk domain PVJ (pisanggorengvanjava.com). Cek di: Cloudflare Dashboard → [Domain] → Overview → Zone ID"
  type        = string

  validation {
    condition     = length(var.cloudflare_zone_id) == 32
    error_message = "Cloudflare Zone ID harus 32 karakter hex."
  }
}

variable "vercel_cname_target" {
  description = "Target CNAME untuk Vercel deployment. Biasanya 'cname.vercel-dns.com' untuk custom domain Vercel."
  type        = string
  default     = "cname.vercel-dns.com"
}
