export default function ConfirmDialog({
  isOpen,
  title = "DELETE TENANT",
  description = "Are you sure you want to delete this tenant and all associated agents? This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  isDestructive = true,
  onConfirm,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    // Clean transparent backdrop — no page blur, no screen-wide darkening
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* High-Diffusion Frosted Glass Panel */}
      <div
        className="relative w-full max-w-[360px] overflow-hidden rounded-[28px] bg-gradient-to-b from-white/95 via-white/90 to-white/85 backdrop-blur-[36px] border border-white/80 shadow-[0_24px_50px_-12px_rgba(15,23,42,0.18),0_4px_16px_rgba(15,23,42,0.06),inset_0_1px_1.5px_rgba(255,255,255,1)] p-6 text-left flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft Center Specular Glow */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-32 bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none blur-md" />

        {/* Top Rim Glare */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

        {/* Content Area */}
        <div className="relative z-10 flex flex-col">
          <p className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase mb-2">
            {title}
          </p>
          <p className="text-[14px] leading-relaxed text-slate-900 antialiased font-medium">
            {description}
          </p>
        </div>

        {/* Internal Action Pills */}
        <div className="relative z-10 flex gap-2.5 w-full pt-1">
          {/* Cancel Pill */}
          <button
            type="button"
            onClick={onClose}
            className="relative flex-1 py-2.5 px-4 rounded-full bg-slate-100/90 hover:bg-slate-200/90 active:scale-[0.98] border border-white/90 text-slate-700 hover:text-slate-950 text-xs font-semibold transition-all shadow-[0_2px_6px_rgba(15,23,42,0.06),inset_0_1px_1px_rgba(255,255,255,1)] cursor-pointer overflow-hidden text-center"
          >
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />
            {cancelText}
          </button>

          {/* Confirm / Delete Pill */}
          <button
            type="button"
            onClick={onConfirm}
            className={`relative flex-1 py-2.5 px-4 rounded-full border text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer overflow-hidden text-center ${
              isDestructive
                ? "bg-gradient-to-b from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-red-300/50 text-white shadow-[0_4px_16px_rgba(239,68,68,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)]"
                : "bg-gradient-to-b from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 border-slate-700/50 text-white shadow-[0_4px_16px_rgba(15,23,42,0.25),inset_0_1px_1px_rgba(255,255,255,0.3)]"
            }`}
          >
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
