type VisibilityOption = {
  key: string;
  icon: string;
  title: string;
  desc: string;
};

type Props = {
  visibility: string;
  setVisibility: (value: string) => void;
  options: VisibilityOption[];
};

export default function VisibilitySelector({
  visibility,
  setVisibility,
  options,
}: Props) {
  return (
    <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl">
      <p className="text-xs tracking-[0.3em] text-white/30">
        可见性
      </p>

      <div className="mt-4 grid gap-2.5">
        {options.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setVisibility(item.key)}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              visibility === item.key
                ? "border-white/25 bg-white/[0.09] text-white"
                : "border-white/10 bg-white/[0.035] text-white/45 hover:border-white/20 hover:text-white/70"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span>{item.icon}</span>

              <span className="text-sm font-medium">
                {item.title}
              </span>
            </div>

            <p className="mt-1.5 text-[11px] leading-5 text-white/30">
              {item.desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}