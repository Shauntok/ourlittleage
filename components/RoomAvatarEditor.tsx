"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, UserRound } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import styles from "./UserRoomClient.module.css";

const MAX_AVATAR_SIZE = 8 * 1024 * 1024;

type RoomAvatarEditorProps = {
  profileId: string;
  username: string;
  initialAvatarUrl: string | null;
};

export default function RoomAvatarEditor({
  profileId,
  username,
  initialAvatarUrl,
}: RoomAvatarEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [isOwner, setIsOwner] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkOwnership() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (active) setIsOwner(user?.id === profileId);
    }

    void checkOwnership();

    return () => {
      active = false;
    };
  }, [profileId]);

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !isOwner || uploading) return;

    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件。");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      toast.error("头像图片不能超过 8MB。");
      return;
    }

    setUploading(true);

    try {
      const cleanName = file.name.replace(/\s+/g, "-");
      const fileName = `${profileId}/${Date.now()}-${cleanName}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);

      if (profileError) throw profileError;

      setAvatarUrl(publicUrl);
      toast.success("头像已更新。");
    } catch {
      toast.error("暂时无法更新头像，请稍后再试。");
    } finally {
      setUploading(false);
    }
  }

  const avatar = avatarUrl ? (
    <img
      src={avatarUrl}
      alt={`${username}的头像`}
      className={`${styles.avatarImage} h-full w-full object-cover`}
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-white/35" aria-label={`${username}的头像`} role="img">
      <UserRound aria-hidden="true" className="h-9 w-9 md:h-14 md:w-14" strokeWidth={1.3} />
    </div>
  );

  if (!isOwner) {
    return (
      <div data-room-skin-avatar-frame className={styles.avatarFrame}>
        <div className={styles.avatarButton}>{avatar}</div>
      </div>
    );
  }

  return (
    <div data-room-skin-avatar-frame className={styles.avatarFrame}>
      <button
        type="button"
        aria-label="更换头像"
        title="更换头像"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className={`${styles.avatarButton} group disabled:cursor-wait`}
      >
        <span className="absolute inset-0">{avatar}</span>
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100 group-focus-visible:bg-black/45 group-focus-visible:opacity-100">
          {uploading ? (
            <LoaderCircle className="h-6 w-6 animate-spin" aria-hidden="true" />
          ) : (
            <Camera className="h-6 w-6" aria-hidden="true" />
          )}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="选择新的头像照片"
        onChange={uploadAvatar}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}
