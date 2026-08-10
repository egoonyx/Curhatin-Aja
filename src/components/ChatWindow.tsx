"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import GalleryPicker from "@/components/GalleryPicker";
import ScheduleMeetingModal from "@/components/ScheduleMeetingModal";
import FilePreviewModal, { isPreviewable } from "@/components/FilePreviewModal";
import { formatDateTime } from "@/lib/utils";
import type { ChatMessage, GalleryFile, Profile } from "@/lib/types";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
function isImageFile(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  const ext = dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
  return IMAGE_EXTS.includes(ext);
}

export default function ChatWindow({
  channelId,
  currentUserId,
  currentUserDepartmentId,
  initialMessages,
  profilesById,
  memberProfiles,
  allProfiles,
  title,
}: {
  channelId: string;
  currentUserId: string;
  /** Fresh chat uploads are also saved into this department's file gallery, if set. */
  currentUserDepartmentId?: string | null;
  initialMessages: ChatMessage[];
  profilesById: Record<string, Profile>;
  /** Members of this channel/DM, used to pre-fill meeting attendees. */
  memberProfiles?: Profile[];
  /** Everyone else that can be added as a meeting attendee. */
  allProfiles?: Profile[];
  title: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [galleryAttachment, setGalleryAttachment] = useState<GalleryFile | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewMsg, setPreviewMsg] = useState<ChatMessage | null>(null);
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
    if (!body.trim() && !file && !galleryAttachment) return;
    setSending(true);
    const supabase = createClient();

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;
    let galleryFileId: string | null = null;

    if (galleryAttachment) {
      attachmentUrl = galleryAttachment.file_url;
      attachmentName = galleryAttachment.file_name;
      galleryFileId = galleryAttachment.id;
    } else if (file) {
      const path = `${channelId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file);
      if (!uploadError) {
        attachmentUrl = supabase.storage.from("chat-attachments").getPublicUrl(path).data
          .publicUrl;
        attachmentName = file.name;

        // also save a copy into the sender's own department gallery
        if (currentUserDepartmentId) {
          const { data: galleryRow } = await supabase
            .from("files")
            .insert({
              department_id: currentUserDepartmentId,
              uploaded_by: currentUserId,
              file_name: file.name,
              file_url: attachmentUrl,
              file_size: file.size,
            })
            .select()
            .single();
          galleryFileId = galleryRow?.id ?? null;
        }
      }
    }

    await supabase.from("chat_messages").insert({
      channel_id: channelId,
      sender_id: currentUserId,
      body: body.trim() || null,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      gallery_file_id: galleryFileId,
    });

    const recipientIds = (memberProfiles ?? [])
      .filter((p) => p.id !== currentUserId)
      .map((p) => p.id);
    if (recipientIds.length > 0) {
      const senderName = profilesById[currentUserId]?.full_name ?? "Someone";
      fetch("/api/push/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileIds: recipientIds,
          title: title || senderName,
          body: body.trim() ? `${senderName}: ${body.trim()}` : `${senderName} sent an attachment`,
          url: "/dashboard/chat",
        }),
      }).catch(() => {});
    }

    setBody("");
    setFile(null);
    setGalleryAttachment(null);
    setSending(false);
  }

  function handleGallerySelect(f: GalleryFile) {
    setPickerOpen(false);
    setFile(null);
    setGalleryAttachment(f);
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
        <h2 className="flex-1 truncate font-medium text-slate-800">{title}</h2>
        <button
          type="button"
          onClick={() => setScheduling(true)}
          className="btn-secondary shrink-0 text-xs"
        >
          📅 Schedule
        </button>
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
                {m.attachment_url && isImageFile(m.attachment_name ?? "") && (
                  <button
                    type="button"
                    onClick={() => setPreviewMsg(m)}
                    className="mt-1 block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.attachment_url}
                      alt={m.attachment_name ?? "Attachment"}
                      className="max-h-48 w-auto rounded-lg border border-sky-100 object-contain"
                    />
                  </button>
                )}
                {m.attachment_url && !isImageFile(m.attachment_name ?? "") && (
                  isPreviewable(m.attachment_name ?? "") ? (
                    <button
                      type="button"
                      onClick={() => setPreviewMsg(m)}
                      className="mt-1 block text-xs text-sky-600 underline"
                    >
                      📎 {m.attachment_name ?? "Attachment"}
                    </button>
                  ) : (
                    <a
                      href={m.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-xs text-sky-600 underline"
                    >
                      📎 {m.attachment_name ?? "Attachment"}
                    </a>
                  )
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {(file || galleryAttachment) && (
        <div className="flex items-center justify-between border-t border-sky-50 px-4 py-2 text-xs text-slate-500 sm:px-6">
          <span className="truncate">
            📎 {file ? file.name : galleryAttachment?.file_name}
            {galleryAttachment && " (from gallery)"}
          </span>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setGalleryAttachment(null);
            }}
            className="shrink-0 text-slate-400 hover:text-red-500"
          >
            Remove
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 items-center gap-2 border-t border-sky-100 p-3 sm:p-4"
      >
        <label className="relative cursor-pointer text-xl text-slate-400 hover:text-sky-600">
          📎
          <input
            type="file"
            className="sr-only"
            onChange={(e) => {
              setGalleryAttachment(null);
              setFile(e.target.files?.[0] ?? null);
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="shrink-0 text-xl text-slate-400 hover:text-sky-600"
          aria-label="Attach from gallery"
        >
          🗃️
        </button>
        <input
          className="input flex-1"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit" disabled={sending} className="btn-primary">
          Send
        </button>
      </form>

      {pickerOpen && (
        <GalleryPicker
          currentUserId={currentUserId}
          onSelect={handleGallerySelect}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {scheduling && (
        <ScheduleMeetingModal
          channelId={channelId}
          currentUserId={currentUserId}
          defaultAttendees={(memberProfiles ?? []).filter((p) => p.id !== currentUserId)}
          allProfiles={allProfiles ?? memberProfiles ?? []}
          onClose={() => setScheduling(false)}
        />
      )}

      {previewMsg?.attachment_url && (
        <FilePreviewModal
          fileUrl={previewMsg.attachment_url}
          fileName={previewMsg.attachment_name ?? "Attachment"}
          onClose={() => setPreviewMsg(null)}
        />
      )}
    </div>
  );
}
