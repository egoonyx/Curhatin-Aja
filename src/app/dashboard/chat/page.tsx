export default function ChatEmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center text-center">
      <div>
        <p className="text-lg font-medium text-slate-600">Select a conversation</p>
        <p className="mt-1 text-sm text-slate-400">
          Or start a new direct message or channel from the left.
        </p>
      </div>
    </div>
  );
}
