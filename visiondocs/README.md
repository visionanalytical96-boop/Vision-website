# VisionDocs

Document automation system for [Vision Analytical](https://github.com/visionanalytical96-boop) —
HPLC/GC/LCMS lab instrument sales, service, and AMC provider based in
Ambarnath, Maharashtra.

VisionDocs is a Flask web application. Each feature area is a self-contained
module (a Flask Blueprint under `app/modules/`) so new document types can be
added without touching existing ones.

## Current status

**Implemented:** Service Report Generator — fill a web form for a completed
service visit, generate a formatted PDF, and download it.

**Planned** (not yet implemented — see [Roadmap](#roadmap)): Customer
Management, Instrument Database, AMC Management, IQ/OQ/PQ Documentation,
Calibration Reports, Spare Parts Inventory, Quotations, AI Assistant
(Ollama), Nextcloud Integration, User Authentication, Dashboard.

## Getting started

```bash
cd visiondocs
python3 -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env            # then edit SECRET_KEY for anything beyond local dev
python run.py                   # http://127.0.0.1:5000
```

WeasyPrint (PDF rendering) needs Pango/Cairo system libraries. On the target
Ubuntu server:

```bash
sudo apt-get install -y libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info
```

### Running tests

```bash
pytest
```

### Production

```bash
gunicorn -w 2 -b 0.0.0.0:8000 'run:app'
```

Set `FLASK_ENV=production` and a real `SECRET_KEY` in the environment (see
`.env.example`) before deploying.

## Architecture

```
visiondocs/
├── run.py                   # entry point (dev server / gunicorn target)
├── config.py                # env-driven config classes
├── app/
│   ├── __init__.py          # create_app() factory — registers blueprints
│   ├── templates/           # Jinja2 templates (web UI + PDF documents)
│   ├── static/               # CSS/JS
│   └── modules/
│       └── service_reports/  # one module = one Blueprint
│           ├── routes.py
│           ├── forms.py      # Flask-WTF form + validation
│           └── pdf.py        # renders template -> PDF via WeasyPrint
├── output/
│   └── service_reports/      # generated PDFs land here (gitignored)
└── tests/
```

### Adding a new module

Each future item in the roadmap below should follow the `service_reports`
pattern:

1. `app/modules/<module_name>/` with `__init__.py` defining a `Blueprint`
2. `routes.py`, plus `forms.py` / a data layer as needed
3. Templates under `app/templates/<module_name>/`
4. Register the blueprint in `app/_register_blueprints()` (`app/__init__.py`)
5. Add a card for it in `app/templates/index.html`

Modules should stay independent — a module may be *used by* another (e.g.
Service Reports will eventually look up a customer from Customer
Management) but should not reach into another module's internals directly;
go through its routes/service functions.

## Roadmap

Design the above module boundary for these, but do not build them until
they're picked up as their own task:

- **Customer Management** — shared customer records other modules reference
- **Instrument Database** — instruments installed per customer
- **AMC Management** — annual maintenance contracts and renewals
- **IQ/OQ/PQ Documentation** — installation/operational/performance qualification docs
- **Calibration Reports** — calibration certificates and due-date tracking
- **Spare Parts Inventory** — stock levels and usage history
- **Quotations** — customer quotations and follow-up
- **AI Assistant** — Ollama-backed drafting/lookup assistant
- **Nextcloud Integration** — sync generated documents to Nextcloud
- **User Authentication** — accounts and role-based access
- **Dashboard** — the current `index.html` module grid becomes this
