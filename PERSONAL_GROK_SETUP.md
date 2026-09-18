# Personal | Google Tasks — Grok Bot setup

Rebuild of the PEC Google Tasks custom MCP for **personal** Google (not Precision E-Cycle).

## Blueprint (how PEC was built)

PEC connector `user-Google Tasks - PEC-xai` exposes these 14 tools (exact Google Tasks API names):

- Task lists: `list_task_lists`, `get_task_list`, `insert_task_list`, `update_task_list`, `patch_task_list`, `delete_task_list`
- Tasks: `list_tasks`, `get_task`, `insert_task`, `update_task`, `patch_task`, `delete_task`, `clear_completed_tasks`, `move_task`

That surface matches **https://github.com/akutishevsky/google-tasks-mcp** (Deno Deploy + OAuth remote MCP at `/mcp`). No private blueprint repo, gist, Drive/OneDrive file, or Gmail notes were found for Ilya's PEC build; the live tool list is the fingerprint.

This fork: https://github.com/Ilya-Shulyak-AI/google-tasks-mcp

## Why remote (not local npx)

Grok Bot custom connectors need a **public HTTPS MCP URL** (Streamable HTTP / SSE). Local `npx` stdio works for Claude Desktop / Grok Build CLI, not for Grok Bot AddMcpServer.

## Efficient path (vs ChatGPT walkthrough)

1. Use this already-forked repo (stateless Deno Deploy MCP POST handler already on `main`).
2. Deploy via Deno Deploy GitHub integration (no local Deno login if you link the repo in the dashboard).
3. One personal GCP OAuth Web client + env vars.
4. Register remote URL with name exactly `Personal | Google Tasks`.

## Step A — Personal Google Cloud (use personal Gmail, NOT PEC)

1. https://console.cloud.google.com — create project e.g. `personal-google-tasks-mcp`.
2. Enable **Google Tasks API**.
3. OAuth consent screen: **External**. App name e.g. `Personal Google Tasks MCP`. Add scope `https://www.googleapis.com/auth/tasks`. Add personal Gmail as test user (or publish to production to avoid 7-day token expiry).
4. Credentials → OAuth client ID → **Web application**.
5. After you know the Deno domain, set Authorized redirect URI to:
   `https://YOUR_DEPLOYED_DOMAIN/callback`
6. Copy Client ID and Client Secret (parent will secret-request these; do not paste into chat).

## Step B — Deno Deploy (sign in with **personal** GitHub: Ilya-Shulyak-AI)

**Preferred: dashboard (no CLI token)**

1. https://dash.deno.com — Sign in with GitHub as **Ilya-Shulyak-AI** (personal). Do **not** use the PEC Deno/GitHub login.
2. New Project → select repo `Ilya-Shulyak-AI/google-tasks-mcp`.
3. Entrypoint: `src/index.ts` (Deno-native; no build step) **or** install `npm install` + build `npm run build` with entrypoint `build/index.js`. Include `public/`.
4. Project name suggestion: `personal-google-tasks-mcp` → URL like `https://personal-google-tasks-mcp.deno.dev`.
5. Environment variables:

| Name | Value |
|------|--------|
| `GOOGLE_CLIENT_ID` | from Step A |
| `GOOGLE_CLIENT_SECRET` | from Step A |
| `GOOGLE_REDIRECT_URI` | `https://YOUR_DEPLOYED_DOMAIN/callback` |
| `ENCRYPTION_SECRET` | 64-char hex from box file `/workspace/personal-google-tasks-mcp/.encryption_secret` (or regenerate with `npm run generate-secret`) |
| `ALLOWED_ORIGINS` | `https://grok.com,https://x.ai,https://claude.ai` |
| `LOG_LEVEL` | `info` |

6. Deploy. Sanity check: `https://YOUR_DEPLOYED_DOMAIN/.well-known/oauth-authorization-server` returns JSON with `mcp_endpoint`.

**CLI alternative:** on the box, run `deployctl deploy --project=personal-google-tasks-mcp --include=build,public build/index.js` after completing the Deno CLI sign-in URL (personal account).

## Step C — Fix Google redirect URI

Set Google OAuth client redirect URI exactly to `https://YOUR_DEPLOYED_DOMAIN/callback` matching `GOOGLE_REDIRECT_URI`.

## Step D — AddMcpServer (parent / Grok Bot)

Exact registration:

- **Method:** remote URL (required for Grok Bot)
- **Name:** `Personal | Google Tasks` (exact spelling, spaces around `|`)
- **URL:** `https://YOUR_DEPLOYED_DOMAIN/mcp`
- **Transport:** streamable HTTP / SSE (whatever AddMcpServer offers for remote)
- **Auth:** OAuth (server advertises `/.well-known/oauth-authorization-server`); user completes Google OAuth card with **personal** Google account

No command/args/env for Grok Bot. (Local npx is only a fallback for non-Bot clients.)

## Step E — User authorize

After AddMcpServer, user clicks Connect / completes OAuth with personal Google (same account as Tasks). Success: tools appear under namespace like `user-Personal | Google Tasks` and `list_task_lists` returns personal lists (not PEC).

## Secrets parent must secret-request from user

1. `GOOGLE_CLIENT_ID`
2. `GOOGLE_CLIENT_SECRET`
3. Optionally `DENO_DEPLOY_TOKEN` if deploying via CLI instead of dashboard

`ENCRYPTION_SECRET` can stay on the box at `/workspace/personal-google-tasks-mcp/.encryption_secret` (gitignored) — parent should pass it into Deno env via secret flow, not paste in chat.

## Do not

- Re-auth or modify `user-Google Tasks - PEC-xai`
- Reuse PEC Deno project / PEC GCP OAuth client
- Invent `tasksmcp.googleapis.com` (does not exist)
