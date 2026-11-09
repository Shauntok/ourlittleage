import Image from "next/image";

export type SettingsIconName =
  | "settings"
  | "room"
  | "skin"
  | "privacy"
  | "security"
  | "about"
  | "changelog";

export default function SettingsPixelIcon({ name, size = 32 }: { name: SettingsIconName; size?: number }) {
  return (
    <Image
      src={`/images/settings-icons/${name}-illustrated.png`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      unoptimized
    />
  );
}
