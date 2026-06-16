type VisibilityOption = {
  key: string;
  icon: string;
  title: string;
  desc: string;
};

type Props = {
  open: boolean;
  visibility: string;
  setVisibility: (value: string) => void;
  options: VisibilityOption[];
  title?: string;
  subtitle?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export default function MobileVisibilityDialog({
  open,
  visibility,
  setVisibility,
  options,
  title = "选择可见性",
  subtitle = "这次留下来的内容，要放在哪里呢？",
  confirmText = "确定",
  cancelText = "再看看",
  onConfirm,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm md:hidden">
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-white/10 bg-zinc-950 p-5 shadow-[0_0_80px_rgba(168,85,247,0.18)]">
        <div className="mb-5">
          <p className="text-xs tracking-[0.35em] text-white/25">
            VISIBILITY
          </p>

          <h2 className="mt-3 text-2xl font-light text-white">{title}</h2>

          <p className="mt-2 text-sm leading-6 text-white/40">{subtitle}</p>
        </div>

        <div className="space-y-3">
          {options.map((option) => {
            const active = visibility === option.key;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setVisibility(option.key)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-violet-400/60 bg-violet-500/15"
                    : "border-white/10 bg-white/[0.035] hover:border-white/20"
                }`}
              >
                <div className="flex gap-3">
                  <span className="text-xl">{option.icon}</span>

                  <div>
                    <p className="text-sm font-semibold text-white/85">
                      {option.title}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-white/35">
                      {option.desc}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.035] px-5 py-3 text-sm text-white/55 transition hover:border-white/20 hover:text-white"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}