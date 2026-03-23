import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const TASKS_FILE = path.join(os.homedir(), ".openclaw", "tasks.json");

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "backlog" | "todo" | "in-progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  agentId?: string;
  labels?: string[];
  url?: string;
  createdAt: string;
  updatedAt: string;
  dueAt?: string;
}

function read(): Task[] {
  try {
    if (!fs.existsSync(TASKS_FILE)) return [];
    return JSON.parse(fs.readFileSync(TASKS_FILE, "utf8")) as Task[];
  } catch {
    return [];
  }
}

function write(tasks: Task[]) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf8");
}

export async function GET() {
  return NextResponse.json(read());
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<Task>;
  if (!body.title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const now = new Date().toISOString();
  const task: Task = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    title: String(body.title),
    description: body.description ? String(body.description) : undefined,
    status: (["backlog","todo","in-progress","review","done"].includes(body.status ?? "")
      ? body.status : "todo") as Task["status"],
    priority: (["low","medium","high","urgent"].includes(body.priority ?? "")
      ? body.priority : "medium") as Task["priority"],
    agentId: body.agentId ? String(body.agentId) : undefined,
    labels: Array.isArray(body.labels) ? body.labels.map(String) : undefined,
    url: body.url ? String(body.url) : undefined,
    dueAt: body.dueAt ? String(body.dueAt) : undefined,
    createdAt: now,
    updatedAt: now,
  };

  const tasks = read();
  tasks.push(task);
  write(tasks);
  return NextResponse.json(task, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json() as Partial<Task>;
  const tasks = read();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });

  tasks[idx] = { ...tasks[idx], ...body, id, updatedAt: new Date().toISOString() };
  write(tasks);
  return NextResponse.json(tasks[idx]);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const tasks = read().filter(t => t.id !== id);
  write(tasks);
  return NextResponse.json({ ok: true });
}
