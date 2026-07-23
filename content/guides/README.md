# Editing the participant guides

The Markdown files in this directory are the editable source for the participant
guides shown at `/guides` on the website.

Each file starts with a short metadata block:

```yaml
---
slug: short-read-assembly
title: Short-read assembly
summary: Assemble paired-end reads and make a defensible QC decision.
exercise: assembly
order: 2
---
```

Keep the `slug` stable because practice pages link to it. Edit the title,
summary and Markdown body normally. The website supports headings, links,
lists, checklists, tables, block quotes and fenced code blocks.

Run `npm run guides:build` after editing if you want to inspect the generated
TypeScript module directly. The normal development and production build
commands run this step automatically.
