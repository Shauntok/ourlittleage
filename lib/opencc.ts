import OpenCC from "opencc-js";

// ===== 简体 → 繁体 =====
export function toTraditional(text: string) {
  const converter = OpenCC.Converter({
    from: "cn",
    to: "tw",
  });

  return converter(text);
}

// ===== 繁体 → 简体 =====
export function toSimplified(text: string) {
  const converter = OpenCC.Converter({
    from: "tw",
    to: "cn",
  });

  return converter(text);
}