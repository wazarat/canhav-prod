import { NextResponse } from "next/server";

import { skillToMarkdown } from "@/lib/agent/skillExport";
import { getAgentSkillById } from "@/lib/demoData";

interface RouteContext {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteContext) {
  const skill = getAgentSkillById(params.id);
  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  if (format === "json") {
    return NextResponse.json(skill, {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new NextResponse(skillToMarkdown(skill), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
