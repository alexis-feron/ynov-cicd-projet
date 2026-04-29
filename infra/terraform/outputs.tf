output "server_public_ip" {
  description = "Public IPv4 of the app server. Use in ansible inventory.ini."
  value       = hcloud_server.app.ipv4_address
}

output "server_private_ip" {
  description = "Private IP of the app server inside the VPC."
  value       = hcloud_server.app.network[*].ip
}

output "ssh_command" {
  description = "Ready-to-use SSH command."
  value       = "ssh deploy@${hcloud_server.app.ipv4_address}"
}

output "ansible_inventory_line" {
  description = "Line to paste in infra/ansible/inventory.ini under [app]."
  value       = "app-server ansible_host=${hcloud_server.app.ipv4_address} ansible_user=deploy"
}
