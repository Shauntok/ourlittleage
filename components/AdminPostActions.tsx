"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type AdminPostActionsProps = {
  id: string | number;
  slug: string;
  showVisibilityActions?: boolean;
  onDelete?: () => void;
};

export default function AdminPostActions({
  id,
  slug,
  showVisibilityActions = false,
  onDelete,
}: AdminPostActionsProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const menuRef = useRef<HTMLDivElement>(null);

  function showMessage(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  async function updateVisibility(visibility: string) {
    const { error } = await supabase
      .from("posts")
      .update({
        visibility,
      })
      .eq("id", id);

    if (error) {
      showMessage(error.message);
      return;
    }

    showMessage(`已设为 ${visibility}`);

    window.setTimeout(() => {
      window.location.reload();
    }, 800);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/articles/${slug}`
      );

      setOpen(false);
      showMessage("链接已复制");
    } catch {
      showMessage("复制失败，请手动复制链接。");
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  return (
    <>
      <div
        ref={menuRef}
        className="absolute right-5 top-5 opacity-0 transition duration-200 group-hover:opacity-100"
      >
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="h-10 w-10 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:border-white hover:text-white"
        >
          ⋯
        </button>

        {open && (
          <div className="absolute right-0 z-30 mt-2 w-44 rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/60">
            <Link
              href={`/admin/edit/${id}`}
              className="block rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
            >
              编辑文章
            </Link>

            <Link
              href={`/articles/${slug}`}
              className="block rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
            >
              查看文章
            </Link>

            {showVisibilityActions && (
              <>
                <div className="mx-2 my-2 border-t border-zinc-800" />

                <button
                  type="button"
                  onClick={() => updateVisibility("public")}
                  className="block w-full rounded-xl px-4 py-3 text-left text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                >
                  🌍 设为 Public
                </button>

                <button
                  type="button"
                  onClick={() => updateVisibility("hidden")}
                  className="block w-full rounded-xl px-4 py-3 text-left text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                >
                  🙈 设为 Hidden
                </button>

                <button
                  type="button"
                  onClick={() => updateVisibility("private")}
                  className="block w-full rounded-xl px-4 py-3 text-left text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                >
                  🔒 设为 Private
                </button>
              </>
            )}

            <button
              type="button"
              onClick={copyLink}
              className="block w-full rounded-xl px-4 py-3 text-left text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
            >
              复制链接
            </button>

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                className="block w-full rounded-xl px-4 py-3 text-left text-sm text-red-400 transition hover:bg-red-500 hover:text-white"
              >
                删除文章
              </button>
            )}
          </div>
        )}
      </div>

      {message && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-white/10 bg-zinc-900/95 px-5 py-3 text-sm text-white shadow-2xl backdrop-blur-xl">
          {message}
        </div>
      )}
    </>
  );
}
