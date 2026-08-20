# Running the agent office on a VPS

Munder Difflin is an Electron **desktop** app. Upstream ships it local-first and does not
support headless or server deployment — their own comparison post points server users at a
different tool. These scripts are our wrapper around that constraint: the app runs on a
virtual display (Xvfb) and you watch it in a browser over noVNC.

We verified the risky parts on a clean Linux box before writing any of this:

| Step | Result |
|---|---|
| `npm install` with native rebuilds (`better-sqlite3`, `node-pty`, `electron-rebuild`) | passed |
| `npm run build` (main, preload, renderer) | passed |
| Electron launch on a virtual display, no physical screen | passed - stayed up 45s |
| `claude setup-token` exists for headless subscription auth | confirmed on CLI v2.1.237 |

What we have **not** verified: a full run on your actual server, and the app's own
behaviour over many hours headless. Treat the first day as a shakedown.

## Steps

```bash
# 1. Readiness check. Installs nothing, changes nothing.
bash preflight.sh

# 2. Install. Takes 5-15 min, mostly native compilation.
sudo bash install-office.sh

# 3. Auth. Run this on a machine WITH a browser (your laptop), not the server:
claude setup-token
#    Paste the token into /opt/office/.office-env as CLAUDE_CODE_OAUTH_TOKEN=...
sudo systemctl restart office-app
```

## Watching it

Browser access binds to **localhost only** by default:

```bash
ssh -L 6080:localhost:6080 root@YOUR_SERVER
# then open http://localhost:6080/vnc.html
```

`--public` opens the port to the internet with only the generated VNC password in front of
it. Use it only behind a firewall rule limited to your own IP, or a TLS reverse proxy.

For phone use, prefer the office dashboard over noVNC — a full Electron GUI over VNC on a
phone screen is painful, and the dashboard answers "who is doing what" directly.

## Services

| Unit | Job |
|---|---|
| `office-xvfb` | the virtual display |
| `office-app` | Munder Difflin itself |
| `office-vnc` | exposes the display over VNC, localhost-bound |
| `office-novnc` | serves VNC to a browser |

```bash
systemctl status office-app
journalctl -u office-app -f
```

## Known rough edges

- **Not vendor-supported.** An upstream change can break the headless path; the app also
  auto-updates, which we have not tested in this configuration.
- **RAM.** 4 GB is the floor, and `npm install` is the peak. Add 2 GB swap on a 4 GB box.
- **Secrets.** The agent token sits in a 0600 file readable by the `office` user. Anyone
  with root on this box, or with the VNC password, can drive your agents and your
  subscription. Firewall accordingly.
- **Autonomy.** Auto mode bypasses permission prompts. Keep the office pointed at a repo
  you can revert, and keep the review gate on anything customer-facing.
