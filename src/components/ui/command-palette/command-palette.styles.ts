export const commandPaletteStyles = {
  overlay:
    "fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  content:
    "fixed left-[50%] top-[12%] z-[101] w-[calc(100%-2rem)] max-w-[520px] translate-x-[-50%] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  inputWrapper:
    "flex items-center gap-2 border-b border-slate-200 px-4",
  inputIcon: "h-4 w-4 shrink-0 text-slate-400",
  input:
    "w-full bg-transparent py-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none",
  list: "max-h-[320px] overflow-y-auto py-2",
  groupLabel:
    "px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400",
  item:
    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 cursor-pointer transition-colors",
  itemActive: "bg-teal-50 text-teal-700",
  itemIcon: "h-4 w-4 shrink-0 text-slate-400",
  itemIconActive: "text-teal-600",
  empty: "px-4 py-8 text-center text-sm text-slate-400",
  hint: "flex items-center justify-end gap-1 border-t border-slate-200 px-4 py-2 text-[11px] text-slate-400",
  kbd: "rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500",
} as const;
