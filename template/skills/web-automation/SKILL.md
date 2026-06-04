---
name: web-automation
description: Use when browsing websites, filling forms, extracting web data, taking screenshots, monitoring pages, or automating browser workflows.
---

# Web Automation

Use Playwright MCP for interactive pages; use `webfetch` for simple static/read-only URLs.

Efficient flow:
1. `browser_navigate` to the URL.
2. `browser_snapshot` before acting; target exact refs from the snapshot.
3. Use form/click/type/select tools; wait only when needed.
4. Use network/console tools for debugging APIs or page errors.
5. Use screenshots only when visual confirmation is needed.
6. Save large extracted data to a file and summarize results.

Avoid unnecessary browsing when a direct fetch, API request, or repo/file search is faster.
