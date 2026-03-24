# Hubert Dashboard

A web dashboard for managing and dispatching tasks to [OpenClaw](https://github.com/frederikhecht/openclaw) AI agents. Built with Rails 8 + React + Inertia.js.

---

## What It Does

Hubert Dashboard sits on top of the OpenClaw runtime — a Node.js AI agent orchestration system — and provides a browser-based interface for:

- **Managing tasks** on a kanban board (Scheduled → Queue → In Progress → Done)
- **Dispatching tasks** to AI agents via the OpenClaw CLI
- **Recurring schedules** — tasks that auto-regenerate after completion
- **Syncing agents and skills** from the local `~/.openclaw/` filesystem
- **Viewing execution logs** from agent session JSONL files
- **Tracking activity** across all agents and tasks

The dashboard integrates with OpenClaw entirely through the filesystem and CLI — no HTTP API or database connection to OpenClaw is needed.

---

## Tech Stack

### Backend

| Layer | Technology |
|-------|-----------|
| Framework | Rails 8.1 |
| Database | SQLite 3 (via `solid_cache`, `solid_queue`) |
| Auth | Rails 8 built-in session auth (`has_secure_password`) |
| Background jobs | Solid Queue |
| Asset pipeline | Propshaft |
| File uploads | Active Storage (local disk) |
| Frontend bridge | Inertia.js (via `inertia_rails` gem) |

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 5 |
| Build tool | Vite 8 (via `vite_rails` gem) |
| Styling | Tailwind CSS 4 |
| Components | Shadcn/ui (Radix primitives) |
| Icons | Lucide React |
| Drag and drop | @dnd-kit/core + @dnd-kit/sortable |
| Navigation | Inertia.js (no client-side router needed) |

---

## How It Works

### OpenClaw Integration

OpenClaw stores its configuration and agent data in `~/.openclaw/`:

```
~/.openclaw/
├── openclaw.json          # Agent definitions, defaults, workspace paths
├── agents/
│   └── {agent-id}/
│       ├── sessions/
│       │   ├── sessions.json     # Session index
│       │   └── {session-id}.jsonl  # Full conversation log
│       └── skills/
│           └── {skill-name}/
│               └── SKILL.md      # Skill definition
└── skills/                # Global managed skills
    └── {skill-name}/
        └── SKILL.md
```

`OpenclawService` reads this directory tree to fetch agents and skills. `TaskLogService` reads JSONL session files to display execution logs on the task detail page.

### Task Dispatch Pipeline

When a queued task with an assigned agent is processed:

1. **`TaskDispatcherJob`** runs every 2 minutes (Solid Queue recurring job)
2. It promotes `scheduled` tasks whose time has arrived → `queue`
3. It dispatches `queue` tasks with an agent → marks as `in_progress`, enqueues `TaskExecutionJob`
4. **`TaskExecutionJob`** calls the OpenClaw CLI:
   ```
   openclaw agent --agent {agent-id} --message "{instructions}" --deliver --channel telegram
   ```
5. On success → task marked `done`, next recurring instance spawned if applicable
6. On failure → error logged in task activity feed

### Instruction Assembly

`TaskInstructionsBuilder` assembles the message sent to the agent in order:

1. Task title
2. Global pre-instructions (set in Settings)
3. Skill instruction (if a skill is selected): `"Use the {skill} skill and read all of its instructions carefully and run them."`
4. Task description / custom instructions

### Recurring Tasks

Recurring tasks use a **completion-triggered** model (not cron):

1. Task completes → `Task#complete!` calls `spawn_next_recurring_task!`
2. A new task is created from the `TaskTemplate` with `scheduled_for` set to the next occurrence
3. `TaskRecurringSchedule#calculate_next_occurrence` handles 6 frequency types: `every_n_hours`, `daily`, `specific_days`, `weekly`, `monthly`, `yearly`

---

## Data Model

```
User
├── task_pre_instructions  # Prepended to every dispatch
└── timezone

Agent (synced from openclaw.json)
├── openclaw_agent_id
├── name, role, active
└── avatar (Active Storage)

Task
├── title, description, skill, status, position
├── agent_id → Agent
├── task_template_id → TaskTemplate
├── task_recurring_schedule_id → TaskRecurringSchedule
├── session_key, dispatched_at, scheduled_for, completed_at, archived_at
└── task_activities → TaskActivity[]

TaskTemplate
├── title, description, skill
├── agent_id → Agent
└── task_recurring_schedules → TaskRecurringSchedule[]

TaskRecurringSchedule
├── frequency_type, interval
├── times_of_day (JSON array), days_of_week (JSON array)
├── day_of_week, day_of_month, month_of_year
├── active, next_run_at
└── task_template_id → TaskTemplate

TaskActivity
├── action (assigned | status_changed)
├── details
├── timestamp
└── task_id → Task

Skill (synced from SKILL.md files)
└── slug, name, description, raw_content
```

---

## Project Structure

```
app/
├── controllers/
│   ├── tasks_controller.rb          # CRUD, reorder, archive, show
│   ├── agents_controller.rb         # Index, show, update avatar, sync
│   ├── skills_controller.rb         # Index, sync
│   ├── activity_controller.rb       # Global activity feed
│   ├── settings_controller.rb       # Pre-instructions, timezone
│   └── api/
│       └── tasks_controller.rb      # JSON API for agents to report status
├── models/
│   ├── task.rb                      # Core model, move_to, complete!, dispatch!
│   ├── task_template.rb             # Reusable task config, create_task!
│   ├── task_recurring_schedule.rb   # Schedule math, spawn_next_task!
│   ├── task_activity.rb             # Event log entries
│   ├── agent.rb                     # Synced from openclaw.json
│   └── skill.rb                     # Synced from SKILL.md files
├── services/
│   ├── openclaw_service.rb          # Reads ~/.openclaw filesystem
│   ├── agent_sync_service.rb        # Syncs openclaw.json agents → DB
│   ├── skill_sync_service.rb        # Syncs SKILL.md files → DB
│   ├── openclaw_dispatch_service.rb # Runs `openclaw agent` CLI
│   ├── task_instructions_builder.rb # Assembles dispatch message
│   └── task_log_service.rb          # Reads agent JSONL session files
├── jobs/
│   ├── task_dispatcher_job.rb       # Recurring: promote + dispatch tasks
│   └── task_execution_job.rb        # Per-task: run CLI, handle result
└── frontend/
    ├── entrypoints/
    │   ├── inertia.tsx              # JS entry (Inertia + React)
    │   └── application.css          # CSS entry (Tailwind + theme)
    ├── pages/
    │   ├── Tasks/Index.tsx          # Kanban board (board + agents view)
    │   ├── Tasks/Show.tsx           # Task detail + execution logs
    │   ├── Agents/Index.tsx         # Agent grid
    │   ├── Agents/Show.tsx          # Agent detail + activity feed
    │   ├── Skills/Index.tsx         # Skills list
    │   ├── Activity/Index.tsx       # Global activity feed
    │   └── Settings/Index.tsx       # Pre-instructions + timezone
    ├── components/
    │   ├── shell/AuthenticatedLayout.tsx  # Sidebar nav + header
    │   ├── ActivityFeed.tsx               # Shared feed (3 contexts)
    │   ├── tasks/TaskCard.tsx             # Draggable task card
    │   ├── tasks/TaskColumn.tsx           # Droppable kanban column
    │   ├── tasks/TaskFormModal.tsx        # Create task + recurring setup
    │   └── agents/AgentAvatar.tsx         # Avatar with initials fallback
    └── types/
        ├── task.ts
        ├── agent.ts
        └── activity.ts
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCLAW_PATH` | `~/.openclaw` | Path to OpenClaw runtime directory |
| `OPENCLAW_CLI` | `openclaw` | Path or name of the OpenClaw CLI binary |
| `OPENCLAW_DELIVERY_CHANNEL` | `telegram` | Delivery channel for dispatched tasks |

---

## Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Task board (home) |
| `GET` | `/tasks/:id` | Task detail page |
| `POST` | `/tasks` | Create task |
| `PATCH` | `/tasks/:id` | Update task |
| `PATCH` | `/tasks/:id/reorder` | Drag-and-drop reorder |
| `PATCH` | `/tasks/:id/archive` | Archive task |
| `DELETE` | `/tasks/:id` | Delete task |
| `GET` | `/agents` | Agents list |
| `GET` | `/agents/:id` | Agent detail |
| `PATCH` | `/agents/:id` | Upload agent avatar |
| `POST` | `/agents/sync` | Sync agents from openclaw.json |
| `GET` | `/skills` | Skills list |
| `POST` | `/skills/sync` | Sync skills from SKILL.md files |
| `GET` | `/activity` | Global activity feed |
| `GET` | `/settings` | Settings page |
| `PATCH` | `/settings` | Save settings |
| `GET` | `/api/tasks` | JSON: list queue/in-progress tasks |
| `PATCH` | `/api/tasks/:id/complete` | JSON: agent reports completion |
| `POST` | `/api/tasks/:id/log` | JSON: agent reports progress |

---

## Getting Started

### Prerequisites

- Ruby 3.3+
- Node.js 20+
- The `openclaw` CLI installed and on your `PATH`
- `~/.openclaw/openclaw.json` present (optional — app degrades gracefully without it)

### Setup

```bash
git clone <repo>
cd hubert-dashboard

bundle install
npm install

bin/rails db:migrate

# Create your user account
bin/rails runner "User.create!(email_address: 'you@example.com', password: 'yourpassword')"
```

### Running

```bash
bin/dev
```

This starts three processes via `Procfile.dev`:
- **web** — Rails server on port 3001
- **vite** — Vite dev server with HMR
- **jobs** — Solid Queue worker (runs TaskDispatcherJob every 2 minutes)

Visit `http://localhost:3001` and log in.

### First Steps

1. **Sync agents** — go to `/agents` → click "Sync Agents" to pull agents from `~/.openclaw/openclaw.json`
2. **Sync skills** — go to `/skills` → click "Sync Skills" to pull skills from SKILL.md files
3. **Set pre-instructions** — go to `/settings` to configure global instructions prepended to every dispatch
4. **Create a task** — click "New Task" on the board, assign an agent, and it will be dispatched automatically

---

## Background Jobs

`TaskDispatcherJob` runs every 2 minutes in both development and production (configured in `config/recurring.yml`).

**Phase 1 — Promote:** Moves `scheduled` tasks whose `scheduled_for` time has passed to `queue`.

**Phase 2 — Dispatch:** For each `queue` task with an assigned agent:
1. Marks task `in_progress`, sets `session_key`
2. Creates "Dispatched" activity entry
3. Enqueues `TaskExecutionJob`

`TaskExecutionJob` makes the blocking CLI call and handles the result. Tasks time out after 10 minutes.
