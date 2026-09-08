const RETURN_ORIGIN = "https://ourlittleage.local";
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

export function safeReturnPath(
  value: string | string[] | null | undefined
): string | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim() ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    CONTROL_CHARACTER.test(value)
  ) {
    return null;
  }

  try {
    const url = new URL(value, RETURN_ORIGIN);
    if (url.origin !== RETURN_ORIGIN) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
