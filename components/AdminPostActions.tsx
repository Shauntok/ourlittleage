"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type AdminPostActionsProps = {
  id: string | number;
  slug: string;

  // ===== 是否显示可见性操作 =====
  showVisibilityActions?: boolean;

  // ===== 删除文章 =====
  onDelete?: () => void;
};

// ===== Admin 文章操作 Dropdown =====
export default function AdminPostActions({
  id,
  slug,
  showVisibilityActions = false,
  onDelete,
}: AdminPostActionsProps) {
  // ===== 控制菜单开关 =====
  const [open, setOpen] = useState(false);

        async function updateVisibility(
        visibility: string
        ) {
        const { error } = await supabase
            .from("posts")
            .update({
            visibility,
            })
            .eq("id", id);

        if (error) {
            alert(error.message);
            return;
        }

        alert(`已设为 ${visibility}`);
        window.location.reload();
        }

  const menuRef = useRef<HTMLDivElement>(null);

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
        document.removeEventListener("mousedown", handleClickOutside);
    };
    }, []);

  return (
    <div
    ref={menuRef}
    className="absolute right-5 top-5 opacity-0 group-hover:opacity-100 transition duration-200"
    >
      {/* ===== 三点按钮 ===== */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-10 w-10 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-white hover:text-white transition"
      >
        ⋯
      </button>

      {/* ===== Dropdown 菜单 ===== */}
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-44 rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/60">
          <Link
            href={`/admin/edit/${id}`}
            className="block rounded-xl px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white transition"
          >
            编辑文章
          </Link>

          <Link
            href={`/articles/${slug}`}
            className="block rounded-xl px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white transition"
          >
            查看文章
          </Link>

                
            {showVisibilityActions && (
            <>
                <div className="mx-2 my-2 border-t border-zinc-800" />

                <button
                type="button"
                onClick={() => updateVisibility("public")}
                className="block w-full text-left rounded-xl px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white transition"
                >
                🌍 设为 Public
                </button>

                <button
                type="button"
                onClick={() => updateVisibility("hidden")}
                className="block w-full text-left rounded-xl px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white transition"
                >
                🙈 设为 Hidden
                </button>

                <button
                type="button"
                onClick={() => updateVisibility("private")}
                className="block w-full text-left rounded-xl px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white transition"
                >
                🔒 设为 Private
                </button>
            </>
            )}

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/articles/${slug}`
              );

              setOpen(false);
              alert("链接已复制");
            }}
            className="block w-full text-left rounded-xl px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white transition">
            复制链接
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="block w-full text-left rounded-xl px-4 py-3 text-sm text-red-400 hover:bg-red-500 hover:text-white transition"
            >
              删除文章
            </button>
          )}
        </div>
      )}
    </div>
  );
}