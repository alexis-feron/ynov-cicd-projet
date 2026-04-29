# ── Authentication ────────────────────────────────────────────
variable "hcloud_token" {
  description = "Hetzner Cloud API token (read/write). Set via TF_VAR_hcloud_token env var."
  type        = string
  sensitive   = true
}

# ── Project ───────────────────────────────────────────────────
variable "project_name" {
  description = "Prefix applied to all resource names."
  type        = string
  default     = "ynov-blog"
}

variable "environment" {
  description = "Deployment environment (staging | production)."
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be 'staging' or 'production'."
  }
}

# ── Server ────────────────────────────────────────────────────
variable "server_type" {
  description = <<-EOT
    Hetzner server type.
      cx21 = 2 vCPU, 4 GB RAM  (~€4.35/mo) - minimum for staging
      cx31 = 2 vCPU, 8 GB RAM  (~€7.52/mo)
      cx41 = 4 vCPU, 16 GB RAM (~€15.08/mo) - recommended for production
  EOT
  type        = string
  default     = "cx21"
}

variable "server_image" {
  description = "OS image (ubuntu-24.04 recommended)."
  type        = string
  default     = "ubuntu-24.04"
}

variable "server_location" {
  description = "Hetzner datacenter location (nbg1=Nuremberg, fsn1=Falkenstein, hel1=Helsinki)."
  type        = string
  default     = "nbg1"
}

# ── SSH ───────────────────────────────────────────────────────
variable "ssh_public_key" {
  description = "Public SSH key added to the server at creation time."
  type        = string
}

variable "allowed_ssh_cidrs" {
  description = "CIDRs allowed to connect via SSH. Restrict to your IPs in production."
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
}

# ── Network ───────────────────────────────────────────────────
variable "private_network_cidr" {
  description = "CIDR for the private network."
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnet_cidr" {
  description = "CIDR for the server subnet."
  type        = string
  default     = "10.0.1.0/24"
}
