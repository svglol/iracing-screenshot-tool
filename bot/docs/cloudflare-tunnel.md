# Cloudflare Tunnel — expose the webhook endpoint

Per D-19, **Cloudflare Tunnel** is the recommended way to let GitHub reach the bot's `POST /webhook/github` endpoint. The bot listens on `localhost:3001`; Cloudflare provides a stable public HTTPS URL that forwards to it.

Direct port forwarding is NOT recommended — it requires a static IP (or dynamic DNS gymnastics), router configuration, a valid TLS cert on your hostname (Let's Encrypt on Windows is painful), and exposes the bot's port to the whole internet (no Cloudflare WAF in front of it). Cloudflare Tunnel solves every one of those problems and is free at the tier we need.

## 1. Why Cloudflare Tunnel (D-19 rationale)

- **No port forwarding.** `cloudflared` makes an outbound connection to Cloudflare; GitHub reaches you through Cloudflare's edge. Home routers and NATed VPSes work unchanged.
- **No TLS cert management.** Cloudflare issues and renews the cert for your hostname automatically.
- **Windows-friendly.** Native binary, no cygwin, no WSL, works as a Windows Service.
- **DDoS and abuse mitigation.** GitHub's IP ranges are allowed; scanner traffic hits Cloudflare's edge, not your server.
- **Easy rotation.** Rename or delete a tunnel from the Cloudflare dashboard if it leaks.

## 2. Prerequisites

- A **free Cloudflare account** at https://dash.cloudflare.com. The free tier is sufficient for our traffic.
- Either:
  - A **domain on Cloudflare** (any registrar, nameservers delegated to Cloudflare — the standard setup for a "named tunnel"), OR
  - For dev/testing only: **no domain required** — use `cloudflared tunnel --url` for a throwaway `*.trycloudflare.com` URL that changes on every restart (see §10 below).

For production pick a real domain. A named tunnel gives you a stable URL; throwaway quick tunnels are for smoke tests only.

## 3. Install `cloudflared`

### Windows

1. Download the latest `cloudflared-windows-amd64.exe` from https://github.com/cloudflare/cloudflared/releases.
2. Create `C:\Program Files\cloudflared\` and move the binary there, renaming it to `cloudflared.exe`.
3. Add `C:\Program Files\cloudflared\` to your **PATH** (System Properties → Environment Variables → Path → Edit → New). Restart your terminal.
4. Verify: `cloudflared --version` prints a version number.

Alternative (if you have it): `winget install Cloudflare.cloudflared`.

### Linux

Debian/Ubuntu:

```bash
# Add Cloudflare's repo and install the .deb
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install cloudflared
```

RHEL/Rocky/Alma:

```bash
curl -fsSL https://pkg.cloudflare.com/cloudflared-ascii.repo | sudo tee /etc/yum.repos.d/cloudflared.repo
sudo yum install cloudflared
```

Or download the appropriate `.deb`/`.rpm`/static binary from https://github.com/cloudflare/cloudflared/releases.

Verify: `cloudflared --version`.

## 4. Authenticate `cloudflared` to your Cloudflare account

```bash
cloudflared tunnel login
```

This opens a browser to https://dash.cloudflare.com/login, asks you to pick a zone (one of the domains on your Cloudflare account), and downloads a `cert.pem` to `~/.cloudflared/cert.pem` (Linux) or `%USERPROFILE%\.cloudflared\cert.pem` (Windows). The cert authorizes `cloudflared` to manage tunnels and DNS for that zone.

## 5. Create a named tunnel

```bash
cloudflared tunnel create iracing-bot
```

Output:

```
Tunnel credentials written to /home/you/.cloudflared/<UUID>.json.
Created tunnel iracing-bot with id <UUID>
```

Copy the UUID — you need it for the config file in §6.

Then route a DNS name to the tunnel. Replace `your-domain.com` with the zone you authenticated in §4:

```bash
cloudflared tunnel route dns iracing-bot iracing-bot.your-domain.com
```

This creates a `CNAME` record `iracing-bot.your-domain.com → <UUID>.cfargotunnel.com` in Cloudflare's DNS. Propagation is instant (Cloudflare's DNS), not subject to the 24-hour gotcha of other providers.

## 6. Config file

Place the config at `~/.cloudflared/config.yml` (Linux) or `%USERPROFILE%\.cloudflared\config.yml` (Windows). The Windows Service variant expects it at `C:\Windows\System32\config\systemprofile\.cloudflared\config.yml` — easiest is to symlink or copy after installing the service; see §9.

```yaml
tunnel: iracing-bot
credentials-file: /home/you/.cloudflared/<UUID>.json

ingress:
  - hostname: iracing-bot.your-domain.com
    service: http://localhost:3001
  - service: http_status:404
```

**Substitute both** the UUID path (from §5 output) and your actual hostname. The trailing `http_status:404` catch-all is mandatory — `cloudflared` rejects configs without a default rule.

On Windows the path format differs:

```yaml
tunnel: iracing-bot
credentials-file: C:\Users\you\.cloudflared\<UUID>.json
ingress:
  - hostname: iracing-bot.your-domain.com
    service: http://localhost:3001
  - service: http_status:404
```

## 7. Smoke-test in the foreground

Before installing as a service, prove the tunnel works:

```bash
cloudflared tunnel run iracing-bot
```

In another terminal, with the bot running (`npm start` in `/bot/`), request the webhook endpoint from the public URL:

```bash
curl -i https://iracing-bot.your-domain.com/webhook/github
```

Expect `405 Method Not Allowed` (the route is POST-only). A 405 proves the route was reached — GET is correctly rejected, which means tunneling and routing both work. If you get a 502 Bad Gateway, `cloudflared` is up but cannot reach `localhost:3001` — start the bot.

Press Ctrl+C to stop `cloudflared` before moving on.

## 8. Set the GitHub webhook Payload URL

Now that you know your public hostname, go back and configure the GitHub webhook to `https://iracing-bot.your-domain.com/webhook/github` — see [github-webhook-setup.md](github-webhook-setup.md) §4.

## 9. Install `cloudflared` as a service (auto-start on boot)

### Windows

Run an Administrator cmd/PowerShell:

```bat
cloudflared.exe service install
```

This registers `cloudflared` as a Windows Service (visible under `services.msc` as **Cloudflared**, Startup type **Automatic**). The service expects its config at `C:\Windows\System32\config\systemprofile\.cloudflared\config.yml` — copy yours there (or edit the service command line via `nssm`-style tooling, but the copy approach is simpler):

```bat
copy "%USERPROFILE%\.cloudflared\config.yml" "C:\Windows\System32\config\systemprofile\.cloudflared\config.yml"
copy "%USERPROFILE%\.cloudflared\<UUID>.json" "C:\Windows\System32\config\systemprofile\.cloudflared\<UUID>.json"
```

Then start it:

```bat
net start cloudflared
```

Reboot-proof; on next Windows boot the tunnel comes up before the bot (the bot's order-of-startup does not matter because GitHub retries for 24 h on delivery failure).

### Linux

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

The Linux installer picks up the config from `~/.cloudflared/config.yml` of the user who ran the install, and runs as root by default. If you prefer a dedicated user, see Cloudflare's docs — for this bot, running `cloudflared` as root is fine: it only binds outbound sockets.

Tail logs: `sudo journalctl -u cloudflared -f`.

## 10. Dev-only quick tunnel (throwaway URL)

For temporary testing without owning a domain:

```bash
cloudflared tunnel --url http://localhost:3001
```

`cloudflared` prints a random `https://<something>.trycloudflare.com` URL. It works for a single session — if you Ctrl+C or the machine sleeps, the URL is gone forever and a restart produces a new one. NOT suitable for production (you would have to re-paste the URL into GitHub's webhook config on every restart, and there's no guarantee about availability or rate limits). Fine for a one-off test or a weekend hack.
