# Vision Analytical ka office — Munder Difflin hires

Yahan 12 ready-made agent manifests hain. Har file ek clone hai — naam, character, model,
aur uska poora charter (goal). Munder Difflin me **import hire** se ek-ek karke load karo.

Ye wahi 10 role charters hain jo `agent-office/roles/*.md` me hain (headless VPS wale harness ke liye),
plus 2 dev clones. Ek hi office, do jagah chalta hai.

## Kaunsa clone kya karta hai

| File | Clone | Kaam | Model |
|---|---|---|---|
| `michael-chief-of-staff` | Michael | **Manager.** Aap isko kaam bolte ho, ye baaki sab me baantta hai | Opus 5 |
| `phyllis-lead-research` | Phyllis | Lead/account ki sacchai nikaalti hai | Sonnet 5 |
| `oscar-qualifier` | Oscar | Lead pursue karein ya nahi | Sonnet 5 |
| `angela-quotation` | Angela | Quotation — **sirf yahi price bol sakti hai** | Opus 5 |
| `andy-amc-renewal` | Andy | AMC renewals, lapsed contracts | Sonnet 5 |
| `dwight-service-scheduler` | Dwight | Ticket triage, engineer, SLA | Sonnet 5 |
| `toby-qualification-compliance` | Toby | IQ/OQ/PQ, regulatory scope | Opus 5 |
| `pam-outreach-writer` | Pam | Customer emails/WhatsApp | Sonnet 5 |
| `kevin-ops-reporter` | Kevin | Roz ka digest | Sonnet 5 |
| `jim-reviewer` | Jim | **Gate.** Har draft check karta hai | Opus 5 |
| `ryan-website-dev` | Ryan | Website features/bugs (git isolated) | Opus 5 |
| `stanley-site-ops` | Stanley | Deploy, backup, uptime (git isolated) | Sonnet 5 |

## Install (~30 min)

**1. Prerequisites**
- Claude Code CLI PATH pe ho (`claude --version` chalna chahiye)
- Node.js 18+
- macOS pe: `xcode-select --install`

**2. App download** — [munderdiffl.in](https://munderdiffl.in) ya GitHub releases.
macOS universal / Windows 64-bit / Linux AppImage. Source se: `git clone` → `npm install` → `npm run dev`.

**3. Onboarding wizard** — 4 sawaal:
- Michael ka engine → **Claude Code**
- Harness home folder → jahan clones kaam karenge
- Project repos register → is repo ka path do (`Vision-website`)
- Auto mode → **pehli baar OFF rakho** (neeche padho)

**4. Clones import karo** — Add Agent → `import hire...` → JSON file chuno → review → spawn.

Is order me karo (ek saath 12 mat chalao):
1. `michael-chief-of-staff` — manager pehle
2. `dwight-service-scheduler` + `andy-amc-renewal` — sabse zyada paisa inhi do me hai
3. `jim-reviewer` — gate, isko jaldi chalu karo
4. `pam-outreach-writer`
5. Baaki jab zarurat pade

## Pehla test kaam

Michael ko bolo (type ya voice):

> Ahmedabad wale Kalpataru ka Waters Alliance HPLC down hai — pressure ripple, do stability batches ruke hain.
> Unka AMC bhi October me expire ho raha hai. Dekho kya karna hai.

Michael ko Dwight ko triage dena chahiye, aur Andy ko renewal — **par renewal ask fix ke baad**,
pehle nahi. Office floor pe live dikhega kaun kya kar raha hai.

## Dhyan rakhne wali baatein

**Model id** — manifests me `claude-opus-5` / `claude-sonnet-5` hai. Agar aapke app me model list alag
dikhe to import ke baad model field me se sahi chun lena — file dobara banane ki zarurat nahi.

**Auto mode** — ye permission prompts bypass kar deta hai. Shuru me OFF rakho, do-teen din dekho
clones kya karte hain, phir on karo. Ryan aur Stanley `isolate: true` pe hain — apne git worktree me
kaam karenge, aapka checkout nahi todenge.

**Rate limits** — 12 clones ek hi Claude subscription pe bahut load hai. 4 se shuru karo
(Michael, Dwight, Andy, Jim), kharcha dekho, phir badhao. Har manifest me `tokenCap` laga hua hai.

**Security** — manifest kabhi apne aap agent spawn nahi karta. Import sirf Add-Agent form bharta hai;
command aap dekh ke, edit karke, khud spawn karte ho. Ye upstream ka design hai, aur achha design hai.

## Ye files kaise verify hui

Upstream repo (`chaitanyagiri/munder-difflin`) ke asli `validateHireManifest()` se — spec tag
`munder-difflin/hire@1`, saare field caps, model regex. Sab 12 VALID nikle. Guess se nahi banaye gaye.
