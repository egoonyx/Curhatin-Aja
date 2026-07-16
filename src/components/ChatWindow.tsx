"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import { formatDateTime } from "@/lib/utils";
import type { ChatMessage, Profile } from "@/lib/types";

export default function ChatWindow({
  channelId,
  currentUserId,
  initialMessages,
  profilesById,
  title,
}: {
  channelId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  profilesById: Record<string, Profile>;
  title: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat_messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && !file) return;
    setSending(true);
    const supabase = createClient();

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;

    if (file) {
      const path = `${channelId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file);
      if (!uploadError) {
        attachmentUrl = supabase.storage.from("chat-attachments").getPublicUrl(path).data
          .publicUrl;
        attachmentName = file.name;
      }
    }

    await supabase.from("chat_messages").insert({
      channel_id: channelId,
      sender_id: currentUserId,
      body: body.trim() || null,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
    });

    setBody("");
    setFile(null);
    setSending(false);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sky-100 px-4 sm:px-6">
        <label
          htmlFor="chat-list-toggle"
          className="cursor-pointer rounded-lg p-1 text-xl text-slate-500 hover:bg-sky-50 md:hidden"
          aria-label="Show conversations"
        >
          ☰
        </label>
        <h2 className="truncate font-medium text-slate-800">{title}</h2>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
        {messages.map((m) => {
          const sender = profilesById[m.sender_id];
          const isMe = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
              <Avatar name={sender?.full_name ?? "?"} url={sender?.avatar_url} size={28} />
              <div className={`max-w-[75%] sm:max-w-md ${isMe ? "text-right" : ""}`}>
                <p className="text-xs text-slate-400">
                  {sender?.full_name ?? "Unknown"} · {formatDateTime(m.created_at)}
                </p>
                {m.body && (
                  <div
                    className={`mt-1 inline-block rounded-2xl px-4 py-2 text-sm ${
                      isMe ? "bg-sky-500 text-white" : "bg-sky-50 text-slate-700"
                    }`}
                  >
                    {m.body}
                  </div>
                )}
                {m.attachment_url && (
                  <a
                    href={m.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-xs text-sky-600 underline"
                  >
                    📎 {m.attachment_name ?? "Attachment"}
                  </a>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 items-center gap-2 border-t border-sky-100 p-3 sm:p-4"
      >
        <label className="relative cursor-pointer text-slate-400 hover:text-sky-600">
          📎
          <input
            type="file"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <input
          className="input flex-1"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={file ? `${file.name} attached...` : "Type a message..."}
        />
        <button type="submit" disabled={sending} className="btn-primary">
          Send
        </button>
      </form>
    </div>
  );
}
