# Ubuntu server par BharatStay live karna (Nginx + Cloudflare)

Yeh app ek Node server hai, static site nahi — isme admin panel, booking,
login aur database hai, jo bina server ke chal hi nahi sakte. Isliye ise
`/var/www` mein rakh kar systemd se chalate hain, aage Nginx lagate hain, aur
Cloudflare ko DNS + CDN ke liye upar rakhte hain.

Ek baar ka kaam — lagbhag 30 minute.

---

## 0. Kya chahiye

- Ubuntu 22.04 ya 24.04 server (1 GB RAM kaafi hai, 2 GB behtar)
- Ek domain jo Cloudflare par hai
- Root ya sudo access

---

## 1. Node, Postgres aur Nginx

```bash
sudo apt update
sudo apt install -y curl git nginx postgresql

# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm
```

## 2. Database banaiye

```bash
sudo -u postgres psql <<'SQL'
CREATE USER bharatstay WITH PASSWORD 'yahan-ek-mazboot-password';
CREATE DATABASE bharatstay OWNER bharatstay;
SQL
```

## 3. Code rakhiye

```bash
sudo adduser --system --group --home /var/www/bharatstay bharatstay
sudo mkdir -p /var/www/bharatstay
# ZIP se: apne laptop se scp karke unzip kar lijiye, ya git se clone kijiye
sudo chown -R bharatstay:bharatstay /var/www/bharatstay
```

## 4. Secrets

```bash
sudo tee /etc/bharatstay.env >/dev/null <<EOF
DATABASE_URL=postgresql://bharatstay:yahan-ek-mazboot-password@localhost:5432/bharatstay
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_EMAIL=aap@example.com
ADMIN_PASSWORD=$(openssl rand -base64 24)
NEXT_PUBLIC_APP_URL=https://bharatstay.in
SMS_PROVIDER=mock
EOF

sudo chmod 600 /etc/bharatstay.env
sudo cat /etc/bharatstay.env    # ADMIN_PASSWORD kahin likh lijiye — reset ka email flow nahi hai
```

## 5. Build aur seed

```bash
cd /var/www/bharatstay
sudo -u bharatstay pnpm install --frozen-lockfile
sudo -u bharatstay --preserve-env=PATH bash -c 'set -a; . /etc/bharatstay.env; set +a; pnpm build:node && pnpm release'
```

`pnpm release` migrations chalata hai aur catalogue + admin account banata hai.

## 6. systemd

```bash
sudo cp deploy/bharatstay.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bharatstay
sudo systemctl status bharatstay      # green hona chahiye
curl -I http://127.0.0.1:3000/         # 200
```

## 7. Nginx

`deploy/nginx.conf` mein `bharatstay.in` ki jagah apna domain daal dijiye, phir:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/bharatstay
sudo ln -s /etc/nginx/sites-available/bharatstay /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## 8. SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d bharatstay.in -d www.bharatstay.in
```

> Cloudflare mein SSL mode **Full (strict)** rakhiye. "Flexible" par redirect
> loop ban jaata hai — Cloudflare http maangta hai, Nginx https par bhejta hai,
> aur browser ghoomta rehta hai.

## 9. Cloudflare

1. DNS → `A` record, apne server ka IP, **proxy on** (orange cloud).
2. SSL/TLS → **Full (strict)**.
3. Speed → Brotli on.
4. Caching → Configuration → Caching Level **Standard**.

> Cache rules mat lagaiye jo poore HTML ko cache kar de. Har page live database
> se aata hai — admin price badle to agla visitor purana daam dekhega.

## 10. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Live hone se pehle — teen kaam

1. **UPI ID daaliye** — `https://aapka-domain/admin` → Site settings. Bina iske
   customer payment nahi kar payega.
2. **Prices aur timings theek kijiye** — seed data sample hai, business naam
   asli hain.
3. **Admin password sambhaliye** — bhool gaye to `/etc/bharatstay.env` mein
   badal ke `pnpm release` dobara chalana padega.

---

## Update kaise karein

```bash
cd /var/www/bharatstay
sudo -u bharatstay git pull                     # ya naya ZIP unzip kar dijiye
sudo -u bharatstay pnpm install --frozen-lockfile
sudo -u bharatstay bash -c 'set -a; . /etc/bharatstay.env; set +a; pnpm build:node && pnpm exec prisma migrate deploy'
sudo systemctl restart bharatstay
```

## Backup

Photos database ke andar hain, isliye ek `pg_dump` hi poora backup hai:

```bash
sudo -u postgres pg_dump bharatstay | gzip > /root/bharatstay-$(date +%F).sql.gz
```

Ise cron mein daal dijiye aur file kisi doosri jagah bhi rakhiye.

## Kuch chal na raha ho

| Dikkat | Dekhiye |
|---|---|
| 502 Bad Gateway | `systemctl status bharatstay`, `journalctl -u bharatstay -n 50` |
| Redirect loop | Cloudflare SSL **Full (strict)** hai ya nahi |
| Admin login nahi ho raha | `pnpm release` chala tha? password `/etc/bharatstay.env` wala hi hai? |
| Photos nahi dikh rahe | Database backup se restore hua hai ya nahi — bytes wahin hain |
| Purana daam dikh raha hai | Cloudflare mein HTML cache rule to nahi laga diya |

---

## Cloudflare Workers par bhi ja sakte hain

Agar server nahi rakhna, to yahi code Cloudflare Workers par bhi chalta hai —
steps [DEPLOY-CLOUDFLARE.md](DEPLOY-CLOUDFLARE.md) mein hain. Ubuntu waala
raasta zyada seedha hai: CPU ki koi limit nahi, aur database usi machine par.
