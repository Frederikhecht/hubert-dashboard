import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const DOCS_FILE = path.join(os.homedir(), ".openclaw", "docs.json");

export interface DocEntry {
  id: string;
  title: string;
  content: string;
  type: "pr" | "deploy" | "note" | "bug" | "feature" | "other";
  agentId?: string;
  url?: string;
  tags?: string[];
  createdAt: string; // ISO string
}

function readDocs(): DocEntry[] {
  try {
    if (!fs.existsSync(DOCS_FILE)) return [];
    return JSON.parse(fs.readFileSync(DOCS_FILE, "utf8")) as DocEntry[];
  } catch {
    return [];
  }
}

function writeDocs(docs: DocEntry[]) {
  fs.writeFileSync(DOCS_FILE, JSON.stringify(docs, null, 2), "utf8");
}

export async function GET() {
  const docs = readDocs();
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<DocEntry>;

  if (!body.title || !body.content) {
    return NextResponse.json({ error: "title and content are required" }, { status: 400 });
  }

  const entry: DocEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    title: String(body.title),
    content: String(body.content),
    type: (["pr", "deploy", "note", "bug", "feature", "other"].includes(body.type ?? "")
      ? body.type
      : "note") as DocEntry["type"],
    agentId: body.agentId ? String(body.agentId) : undefined,
    url: body.url ? String(body.url) : undefined,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
    createdAt: new Date().toISOString(),
  };

  const docs = readDocs();
  docs.unshift(entry); // newest first
  writeDocs(docs);

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const docs = readDocs();
  const filtered = docs.filter(d => d.id !== id);
  writeDocs(filtered);

  return NextResponse.json({ ok: true });
}
