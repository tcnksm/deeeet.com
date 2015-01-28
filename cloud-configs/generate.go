package main

import (
	"bufio"
	"bytes"
	"fmt"
	"os"
	"os/exec"
)

// Need to input etcd:discovery, etcd:addr, fleet:metadata
const CloudConfigFmt = `#cloud-config

coreos:
  etcd:
    discovery: %s
    addr: %s:4001
    peer-addr: $public_ipv4:7001      
  fleet:
    # used for fleetctl ssh command
    public-ip: $private_ipv4
    metadata: role=%s,provider=digitalocean
  units:
    - name: etcd.service
      command: start
    - name: fleet.service
      command: start
    - name: settimezone.service
      command: start
      content: |
        [Unit]
        Description=Set the timezone

        [Service]
        ExecStart=/usr/bin/timedatectl set-timezone UTC
        RemainAfterExit=yes
        Type=oneshot
    - name: download-crypt.service
      command: start
      content: |
         [Unit]
         Description=Install crypt
         Documentation=https://github.com/xordataexchange/crypt

         Requires=network-online.target
         After=network-online.target
         
         [Service]
         Type=oneshot
         ExecStartPre=-/usr/bin/mkdir -p /opt/bin         
         ExecStart=/usr/bin/sh -c '/usr/bin/wget -N -O /opt/bin/crypt https://github.com/xordataexchange/crypt/releases/download/v0.0.1/crypt-0.0.1-linux-amd64; /usr/bin/chmod +x /opt/bin/crypt'

  update:
    group: alpha
    reboot-strategy: best-effort

write_files:
  - path: /etc/ntp.conf
    content: |
      # Common pool
      server 0.pool.ntp.org
      server 1.pool.ntp.org

      # - Allow only time queries, at a limited rate.
      # - Allow all local queries (IPv4, IPv6)
      restrict default nomodify nopeer noquery limited kod
      restrict 127.0.0.1
      restrict [::1]
  - path: /etc/deeeet-com-secring.gpg
    content: |
%s 
`

func main() {
	os.Exit(_main())
}

func _main() int {
	// Usage: go run generate.go
	var err error

	// If DEBUG mode or DISCOVERY_URL is not generated
	// get new discovery url and use it
	var discovery string
	if os.Getenv("DEBUG") != "" || os.Getenv("DISCOVERY_URL") == "" {
		discovery, err = newDiscovery()
		if err != nil {
			fmt.Fprint(os.Stderr, err)
			return 1
		}
	} else {
		discovery = os.Getenv("DISCOVERY_URL")
	}

	key, err := retrieveKey()
	if err != nil {
		fmt.Fprintf(os.Stderr, "[Error] Failed to read key: %s", err)
		return 1
	}

	var etcd_addr string
	etcd_addr = "$private_ipv4"
	err = genConfig("lb", discovery, etcd_addr, key)
	if err != nil {
		return 1
	}

	etcd_addr = "$public_ipv4"
	err = genConfig("web", discovery, etcd_addr, key)
	if err != nil {
		return 1
	}
	return 0
}

func genConfig(role, discovery, etcd_addr, key string) error {
	filename := fmt.Sprintf("%s.yml", role)
	file, err := os.OpenFile(filename, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return fmt.Errorf("[Error] Failed to open file %s: %s", filename, err)
	}
	defer file.Close()

	fmt.Fprintf(file, CloudConfigFmt, discovery, etcd_addr, role, key)
	return nil
}

func retrieveKey() (string, error) {
	filename := "pgp-key/deeeet-com-secring.gpg"
	file, err := os.Open(filename)
	if err != nil {
		return "", err
	}

	var key string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		key += fmt.Sprintf("      %s\n", scanner.Text())
	}
	return key, nil
}

func newDiscovery() (string, error) {
	var stdout bytes.Buffer
	cmd := exec.Command("curl", "https://discovery.etcd.io/new")
	cmd.Stdout = &stdout

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("[Error] Failed to fetch new discovery url: %s", err)
	}

	return stdout.String(), nil
}
