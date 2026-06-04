---
name: development
description: Use for software development tasks: code edits, git, npm/pnpm/yarn, Python, builds, tests, debugging, project setup.
---

# Development

Workflow:
- Inspect first: `git status`, targeted glob/grep/read, then edit.
- Prefer project scripts over ad-hoc commands: `npm test`, `npm run build`, `pytest`, etc.
- Run the narrowest verification that proves the change; broaden only if failures suggest it.
- Before commits/PRs: inspect status, diff, and recent log; stage only intended files; never commit secrets.
- On Windows PowerShell, avoid `&&`; use `cmd1; if ($?) { cmd2 }`. On Unix, standard shell chaining works.

Common commands:
- Git: `git status`, `git diff`, `git log --oneline -10`, `git checkout -b <branch>`.
- Node: `npm install`, `npm test`, `npm run build`, `node script.js`, `npx <tool>`.
- Python: `python -m venv .venv`, `source .venv/bin/activate` (Unix) / `.\.venv\Scripts\Activate.ps1` (Win), `pip install -r requirements.txt`, `pytest`.
- Docker: `docker compose up`, `docker build -t <tag> .`, `docker ps`.
