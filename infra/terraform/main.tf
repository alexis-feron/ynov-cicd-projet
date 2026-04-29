# ═══════════════════════════════════════════════════════════════════════════
#  IaC - Hetzner Cloud - ynov-blog
#
#  Creates:
#    • SSH key
#    • Private network + subnet
#    • Firewall (SSH, HTTP/S, app ports)
#    • App server (Ubuntu 24.04)
#
#  Adapt to another cloud by swapping the provider block in providers.tf
#  and replacing hcloud_* resources with the equivalent:
#    AWS:          aws_instance, aws_vpc, aws_security_group
#    GCP:          google_compute_instance, google_compute_network
#    DigitalOcean: digitalocean_droplet, digitalocean_vpc
# ═══════════════════════════════════════════════════════════════════════════

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_labels = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}

# ── SSH key ───────────────────────────────────────────────────────────────────
resource "hcloud_ssh_key" "deploy" {
  name       = "${local.name_prefix}-deploy"
  public_key = var.ssh_public_key
  labels     = local.common_labels
}

# ── Private network ───────────────────────────────────────────────────────────
resource "hcloud_network" "main" {
  name     = "${local.name_prefix}-network"
  ip_range = var.private_network_cidr
  labels   = local.common_labels
}

resource "hcloud_network_subnet" "app" {
  network_id   = hcloud_network.main.id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = var.private_subnet_cidr
}

# ── Firewall ──────────────────────────────────────────────────────────────────
resource "hcloud_firewall" "app" {
  name   = "${local.name_prefix}-firewall"
  labels = local.common_labels

  # SSH - restricted to operator IPs
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = var.allowed_ssh_cidrs
  }

  # HTTP - public (Nginx/Caddy will terminate TLS and reverse-proxy to apps)
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  # HTTPS - public
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  # ICMP (ping) - useful for monitoring
  rule {
    direction  = "in"
    protocol   = "icmp"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  # All outbound traffic allowed (OS updates, Docker pulls, GHCR)
  rule {
    direction       = "out"
    protocol        = "tcp"
    port            = "any"
    destination_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction       = "out"
    protocol        = "udp"
    port            = "any"
    destination_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction       = "out"
    protocol        = "icmp"
    destination_ips = ["0.0.0.0/0", "::/0"]
  }
}

# ── App server ────────────────────────────────────────────────────────────────
resource "hcloud_server" "app" {
  name        = "${local.name_prefix}-app"
  server_type = var.server_type
  image       = var.server_image
  location    = var.server_location
  ssh_keys    = [hcloud_ssh_key.deploy.id]
  firewall_ids = [hcloud_firewall.app.id]
  labels      = local.common_labels

  # Cloud-init: create the deploy user on first boot
  # Ansible takes over once the server is up (playbooks/setup.yml)
  user_data = <<-EOF
    #cloud-config
    users:
      - name: deploy
        groups: [sudo]
        shell: /bin/bash
        sudo: ALL=(ALL) NOPASSWD:ALL
        ssh_authorized_keys:
          - ${var.ssh_public_key}
    packages:
      - python3          # Required by Ansible
      - python3-pip
    package_update: true
  EOF

  # Attach to private network
  network {
    network_id = hcloud_network.main.id
    ip         = cidrhost(var.private_subnet_cidr, 10)  # static private IP: 10.0.1.10
  }

  depends_on = [hcloud_network_subnet.app]
}
