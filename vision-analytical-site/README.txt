VISION ANALYTICAL — WEBSITE (Version 2 · Industrial Premium Redesign)
=====================================================================

A complete redesign — premium, corporate, industrial look (navy / white /
graphite / soft-blue / subtle gold), inspired by Thermo Fisher, Agilent,
Waters and Shimadzu. Fonts: Manrope (headings) + Inter (body). No neon,
no cursor effects — clean, professional, fully responsive.


PAGES (18 total)
----------------
index.html          Home (hero, brands, products, services, why-us,
                    stats, industries, trust, process, testimonials, CTA)
products.html       Full product catalogue
services.html       All services (install, AMC, IQ/OQ/PQ, calibration…)
amc.html            AMC / CMC plans
about.html          About / why choose / stats / testimonials
contact.html        Contact — info, hours, Google map, quote/visit/service form

Product detail pages (each: overview, features, specifications, applications,
industries, available models, compatible software, install/qualification/
warranty, related products, quote CTA):
  hplc · gc · lcms · gcms · uv-vis · ftir · karl-fischer ·
  balance · moisture · toc · dissolution · lab-equipment

css/style.css       All styling (shared by every page)
js/main.js          All scripts (shared by every page)
images/             Your photos go here (see below)


HOW TO HOST
-----------
Upload the WHOLE folder (all .html files + css/ + js/ + images/) to your
web root (e.g. cPanel "public_html"). index.html opens automatically.
No database or server setup — it is a pure static website.


>>> IMPORTANT: ADD YOUR REAL PHOTOS <<<
---------------------------------------
Per your instructions, NO stock photos are used. Product images and the
hero/engineer/calibration areas show clean placeholders that say
"Add photo…". Replace them with YOUR real photos:

1) Put your photos in the images/ folder with these exact names:
     images/hero.jpg          (a real lab / instrument photo — wide)
     images/engineer.jpg      (your service engineer at work)
     images/calibration.jpg   (calibration / installation photo)
2) Then, in the HTML, replace the placeholder block with an <img>. Example
   for the hero (in index.html) — swap:
     <div class="img-ph dark"> … </div>
   with:
     <img src="images/hero.jpg" alt="Our laboratory">

   For each PRODUCT page, replace the ".pd-media" placeholder the same way
   with your real instrument photo, e.g. images/hplc.jpg.

TIP: I could not include manufacturer product photos (Shimadzu / Waters /
Agilent images are copyrighted). Use your own product photos, or official
images you are licensed to use.


CONTACT DETAILS (already set)
-----------------------------
Phone / WhatsApp : +91 91362 16080
Email            : visionanalytical96@gmail.com
Location         : Ambarnath, Thane, Maharashtra
Business hours   : Mon–Fri 9:30–18:30, Sat 9:30–15:00

The contact form ("Send via WhatsApp") opens WhatsApp with the visitor's
name, phone, instrument and message pre-filled to your number.

Google Map: the contact page embeds a map for "Ambarnath, Thane". To pin
your exact shop, open Google Maps → your location → Share → Embed a map →
copy the <iframe> src and paste it into the map iframe in contact.html.


NOTES
-----
- Fonts load from Google Fonts, and the contact map loads from Google Maps
  — both need an internet connection (they degrade gracefully offline:
  system fonts are used and the map area stays blank).
- Fully responsive: mobile, tablet and desktop.
- Animations are minimal (subtle fade-in + clean hover) as requested.
- All icons are professional SVG line icons (no emoji).
