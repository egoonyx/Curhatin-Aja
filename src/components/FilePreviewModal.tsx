"use client";

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
const VIDEO_EXTS = ["mp4", "webm", "mov", "ogg", "ogv"];
const AUDIO_EXTS = ["mp3", "wav", "m4a", "aac", "flac"];
// Word / Excel / PowerPoint - rendered via Microsoft's free Office Online
// viewer, which just needs a publicly reachable https URL (our Supabase
// storage links qualify) - no download, no Office license needed to view.
const OFFICE_EXTS = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"];
// Plain text formats browsers already know how to render inline in a frame.
const TEXT_EXTS = ["txt", "csv", "md", "json", "log"];

function getExt(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/** Whether FilePreviewModal can render this file inline (vs. download-only). */
export function isPreviewable(fileName: string) {
  const ext = getExt(fileName);
  return (
    IMAGE_EXTS.includes(ext) ||
    ext === "pdf" ||
    VIDEO_EXTS.includes(ext) ||
    AUDIO_EXTS.includes(ext) ||
    OFFICE_EXTS.includes(ext) ||
    TEXT_EXTS.includes(ext)
  );
}

export default function FilePreviewModal({
  fileUrl,
  fileName,
  onClose,
}: {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}) {
  const ext = getExt(fileName);
  const isImage = IMAGE_EXTS.includes(ext);
  const isPdf = ext === "pdf";
  const isVideo = VIDEO_EXTS.includes(ext);
  const isAudio = AUDIO_EXTS.includes(ext);
  const isOffice = OFFICE_EXTS.includes(ext);
  const isText = TEXT_EXTS.includes(ext);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-sky-50 px-4 py-3">
          <p className="min-w-0 truncate text-sm font-medium text-slate-700">{fileName}</p>
          <div className="flex shrink-0 items-center gap-3">
            <a
              href={fileUrl}
              download={fileName}
              className="text-xs font-medium text-sky-600 hover:underline"
            >
              Download
            </a>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Close preview"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-50 p-2 sm:p-4">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl}
              alt={fileName}
              className="max-h-[80vh] w-auto max-w-full object-contain"
            />
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              title={fileName}
              className="h-[80vh] w-full rounded-lg bg-white"
            />
          ) : isVideo ? (
            <video src={fileUrl} controls className="max-h-[80vh] w-full rounded-lg" />
          ) : isAudio ? (
            <audio src={fileUrl} controls className="w-full" />
          ) : isOffice ? (
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
              title={fileName}
              className="h-[80vh] w-full rounded-lg bg-white"
            />
          ) : isText ? (
            <iframe
              src={fileUrl}
              title={fileName}
              className="h-[80vh] w-full rounded-lg bg-white"
            />
          ) : (
            <div className="p-10 text-center text-sm text-slate-500">
              <p>Preview isn&apos;t available for this file type.</p>
              <a
                href={fileUrl}
                download={fileName}
                className="mt-2 inline-block font-medium text-sky-600 hover:underline"
              >
                Download {fileName}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
