terraform {
  required_version = ">= 1.6"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }

  # ── Remote state ────────────────────────────────────────────
  # Uncomment one backend to persist state outside of local disk.
  # Hetzner Object Storage is S3-compatible and costs ~€0.01/GB.
  #
  # backend "s3" {
  #   endpoint                    = "https://fsn1.your-objectstorage.com"
  #   bucket                      = "ynov-blog-tfstate"
  #   key                         = "${var.environment}/terraform.tfstate"
  #   region                      = "main"               # any non-empty value
  #   skip_credentials_validation = true
  #   skip_metadata_api_check     = true
  #   skip_region_validation      = true
  #   force_path_style            = true
  # }
  #
  # Alternative: Terraform Cloud (free for small teams)
  # cloud {
  #   organization = "ynov-blog"
  #   workspaces { name = "staging" }
  # }
}

provider "hcloud" {
  token = var.hcloud_token
}
