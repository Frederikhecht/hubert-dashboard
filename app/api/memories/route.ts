import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WORKSPACE = path.join(os.homedir(), ".openclaw", "workspace");
const MEMORY_DIR = path.join(WORKSPACE, "memory");

const CORE_FILES = ["SOUL.md", "USER.md", "AGENTS.md", "TOOLS.md", "HEARTBEAT.md", "IDENTITY.md"];

function readFile(filePath: string): string {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  } catch {
    return "";
  }
}

function todayLog(): string {
  const d = new Date();
  const name = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.md`;
  return path.join(MEMORY_DIR, name);
}

// GET /api/memories?type=files|logs|all (default: all)
export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get("type") ?? "all";

  const result: {
    files?: Record<string, string>;
    logs?: { date: string; content: string }[];
  } = {};

  if (type === "files" || type === "all") {
    result.files = {};
    for (const name of CORE_FILES) {
      result.files[name] = readFile(path.join(WORKSPACE, name));
    }
  }

  if (type === "logs" || type === "all") {
    try {
      fs.mkdirSync(MEMORY_DIR, { recursive: true });
      const entries = fs.readdirSync(MEMORY_DIR)
        .filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
        .sort()
        .reverse()
        .slice(0, 30); // last 30 days

      result.logs = entries.map(f => ({
        date: f.replace(".md", ""),
        content: readFile(path.join(MEMORY_DIR, f)),
      }));
    } catch {
      result.logs = [];
    }
  }

  return NextResponse.json(result);
}

// POST /api/memories — append a bullet to today's daily log
export async function POST(req: NextRequest) {
  const body = await req.json() as { content: string; agentId?: string };
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  fs.mkdirSync(MEMORY_DIR, { recursive: true });

  const logPath = todayLog();
  const dateStr = path.basename(logPath, ".md");

  // Create header if new file
  let existing = readFile(logPath);
  if (!existing) {
    existing = `# ${dateStr}\n\n`;
  }

  const prefix = body.agentId ? `[${body.agentId}] ` : "";
  const line = `- ${prefix}${body.content.trim()}\n`;
  fs.writeFileSync(logPath, existing + line, "utf8");

  return NextResponse.json({ ok: true, date: dateStr });
}

// PUT /api/memories?file=USER.md — overwrite a core workspace file
export async function PUT(req: NextRequest) {
  const file = new URL(req.url).searchParams.get("file");
  if (!file || !CORE_FILES.includes(file)) {
    return NextResponse.json({ error: "invalid file" }, { status: 400 });
  }

  const { content } = await req.json() as { content: string };
  fs.writeFileSync(path.join(WORKSPACE, file), content ?? "", "utf8");
  return NextResponse.json({ ok: true });
}
