import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeContentLink, isAiConfigured } from "@/lib/ai";

export async function POST(req: Request) {
  const { postId } = await req.json();
  if (!postId) {
    return NextResponse.json({ error: "Missing postId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: post } = await supabase
    .from("content_posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (!post) {
    return NextResponse.json({ error: "Content post not found" }, { status: 404 });
  }

  if (!isAiConfigured()) {
    return NextResponse.json({ skipped: true, reason: "AI analysis isn't connected yet" });
  }

  const analysis = await analyzeContentLink(post.link_url);
  if (!analysis) {
    return NextResponse.json({ skipped: true, reason: "Couldn't analyze that link" });
  }

  const { error } = await supabase
    .from("content_posts")
    .update({
      title: analysis.title,
      ai_summary: analysis.summary,
      ai_tone: analysis.tone,
      ai_topics: analysis.topics,
      ai_suggestions: analysis.suggestions,
    })
    .eq("id", postId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ analysis });
}
