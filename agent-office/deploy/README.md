# VPS पर agent office चलाना

दो चीज़ें अलग-अलग हैं। दोनों एक ही role charters (`roles/*.md`) से चलती हैं।

| | क्या है | कहाँ चलती है |
|---|---|---|
| **Munder Difflin** | office floor वाली GUI — Michael manager, clones दिखते हैं | desktop app (VPS पर जुगाड़ से) |
| **agent-office harness** | बिना screen वाला दिमाग़ — shift, review gate, ledger | कहीं भी, server के लिए ही बना है |

## पहले ये पढ़ें — VPS वाली सच्चाई

Munder Difflin के author ने खुद always-on के लिए **Mac Mini** recommend किया है। पूरे repo में
Xvfb/VNC/Docker का कोई ज़िक्र नहीं — यानी **Linux VPS पर GUI चलाना unsupported जुगाड़ है**।

काम करता है (Xvfb + noVNC से), पर सच ये है:

- Electron बिना GPU के software rendering करेगा — office floor धीमा चलेगा
- App update होने पर ये setup टूट सकता है, दोबारा जोड़ना पड़ेगा
- RAM कम से कम 8 GB — 4 GB पर 2-3 agent से ज़्यादा नहीं

**अगर आपको सिर्फ़ 24/7 काम चाहिए, floor देखना ज़रूरी नहीं** — तो GUI छोड़ दीजिए और नीचे
"सिर्फ़ harness" वाला हिस्सा पढ़िए। वो VPS के लिए ही बना है, हल्का है, और टूटेगा नहीं।

## Step 1 — VPS जाँचिए (कुछ install नहीं होता)

```bash
ssh root@your-vps 'bash -s' < deploy/preflight.sh
```

RAM, disk, Node, toolchain, Xvfb, claude CLI — सब check करके बता देगा क्या कमी है।
`blockers: 0` आए तभी आगे बढ़िए।

## Step 2 — Install

पूरा `agent-office` folder VPS पर copy कीजिए, फिर:

```bash
scp -r agent-office root@your-vps:/root/
ssh root@your-vps 'cd /root/agent-office/deploy && sudo bash install.sh'
```

Script ये सब करती है — Node 20, Electron की libraries, Xvfb + x11vnc + noVNC,
Munder Difflin का source build, Claude Code CLI, और systemd services (reboot के बाद भी चलेंगी)।

Build में 10-20 मिनट लग सकते हैं। घबराइए मत।

## Step 3 — Claude Code login (एक बार)

```bash
ssh -t office@your-vps 'claude'
```

जब तक login नहीं होगा, कोई agent काम नहीं करेगा।

## Step 4 — Office floor खोलिए

VNC जान-बूझकर **सिर्फ़ localhost पर** bound है। Port इंटरनेट पर मत खोलिए — जिसे वो screen मिल गई,
उसे आपके Claude Code login वाला terminal मिल गया।

```bash
ssh -L 6080:localhost:6080 office@your-vps
```

फिर browser में: **http://localhost:6080/vnc.html**

फ़ोन से भी चलेगा — Termius जैसे app में वही tunnel बनाइए।

## Step 5 — अपने 10 clones import कीजिए

Office floor पर → **Add agent** → **import hire...** → `/opt/agent-office/hires/` से file चुनिए।

| File | Floor पर | डेस्क |
|---|---|---|
| `chief-of-staff.hire.json` | Michael | काम बाँटता है, बड़े फ़ैसले आप तक लाता है |
| `service-scheduler.hire.json` | Dwight | Service tickets, engineer visit, SLA |
| `amc-renewal.hire.json` | Andy | AMC renewals, lapsed contracts |
| `quotation.hire.json` | Angela | Quotation — सिर्फ़ यही price बोल सकती है |
| `lead-research.hire.json` | Phyllis | नई enquiry की छानबीन |
| `qualifier.hire.json` | Oscar | Lead pursue करें या नहीं |
| `qualification-compliance.hire.json` | Toby | IQ/OQ/PQ, NABL/GMP timing |
| `outreach-writer.hire.json` | Pam | Email/WhatsApp draft |
| `ops-reporter.hire.json` | Kevin | शाम का digest |
| `reviewer.hire.json` | Jim | हर draft की जाँच, भेजने से पहले |

Import से कोई agent अपने आप spawn **नहीं** होता — बस form भर जाता है, आप देखकर spawn करते हैं।

Model: manifest में `claude-sonnet-4-6` / `claude-opus-4-8` भरा है (app की अपनी suggestion list से)।
आपके Claude Code में नया model हो तो Add Agent dialog में बदल लीजिए — manifest सिर्फ़ pre-fill करता है।

## सिर्फ़ harness (GUI के बिना) — VPS के लिए सबसे सही

```bash
ssh office@your-vps
cd /opt/agent-office
echo 'ANTHROPIC_API_KEY=sk-ant-...' | sudo tee /etc/agent-office.env
sudo chmod 600 /etc/agent-office.env

node bin/office.mjs doctor
node bin/office.mjs run --shift daily
node bin/office.mjs inbox
```

रोज़ अपने आप चलाने के लिए:

```bash
sudo sed -e 's|@USER@|office|g' -e 's|@HARNESS_DIR@|/opt/agent-office|g' \
  deploy/systemd/office-shift.service > /etc/systemd/system/office-shift.service
sudo cp deploy/systemd/office-shift.timer /etc/systemd/system/
sudo systemctl enable --now office-shift.timer
systemctl list-timers office-shift
```

## रोज़ के command

```bash
systemctl status munder-difflin        # चल रही है?
journalctl -u munder-difflin -f        # live log
systemctl restart munder-difflin       # अटक जाए तो
systemctl stop munder-difflin          # बंद
```

## सुरक्षा — तीन बातें कभी मत भूलिए

1. **Port 5900 / 6080 इंटरनेट पर कभी मत खोलिए।** हमेशा SSH tunnel।
2. **App root से मत चलाइए।** Installer `office` user बनाता है — वही ठीक है।
3. **Auto mode सोच-समझकर।** वो permission prompts हटा देता है, यानी agent बिना पूछे command चलाएगा।
   पहले हफ़्ता बिना auto mode के चलाइए, भरोसा बनने के बाद ही चालू कीजिए।
