"use client"

import { useEffect, useState } from "react"

export default function LandingPage() {
  const [showLoginDock, setShowLoginDock] = useState(false)
  const [lockEntry, setLockEntry] = useState(false)
  const [showLoginBox, setShowLoginBox] = useState(false)
  const [musicOpen, setMusicOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY
      const h = window.innerHeight

      if (y > h * 1.2) {
        setShowLoginDock(true)
      }

      if (y > h * 1.85) {
        setLockEntry(true)
        setShowLoginBox(true)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = lockEntry ? "hidden" : ""

    return () => {
      document.body.style.overflow = ""
    }
  }, [lockEntry])

  return (


    
    <main className="min-h-screen bg-black text-white">

      {/* 第一屏 */}
      <section className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <p className="mb-6 text-xs tracking-[0.5em] text-white/30">
            小时代
          </p>

          <h1 className="text-5xl font-light tracking-tight md:text-7xl">
            深夜以后，故事开始。
          </h1>

          <p className="mx-auto mt-8 max-w-xl text-sm leading-7 text-white/45">
            一个给文字、记忆、秘密和生活碎片慢慢停靠的地方。
          </p>
        </div>
      </section>

      {/* 游客内容预览 */}
      <section className="min-h-screen bg-black px-6 py-32 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="mb-6 text-xs tracking-[0.4em] text-white/30">
            游客预览
          </p>

          <h2 className="mb-8 text-4xl font-light leading-tight md:text-6xl">
            你可以先经过这里，
            <br />
            但故事会等居民回来。
          </h2>

          <div className="space-y-4">
            {["深夜日记", "未寄出的信", "某个夏天的结尾"].map((item) => (
              <div
                key={item}
                className="
                  rounded-3xl border border-white/10 bg-white/[0.03]
                  p-6 backdrop-blur-sm
                "
              >
                <p className="text-lg text-white/80">{item}</p>
                <p className="mt-3 line-clamp-2 text-sm leading-7 text-white/35">
                  这里会显示一小段故事预览。游客只能看见片段，更多内容需要进入居民入口。
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 为了制造足够 scroll 空间 */}
      <section className="h-[80vh] bg-black" />

      {/* 登录入口吸附按钮 */}
      <div
        className={`
          fixed left-1/2 z-40 -translate-x-1/2 transition-all duration-1000 ease-out
          ${
            showLoginDock
              ? "bottom-10 opacity-100 scale-100"
              : "-bottom-20 opacity-0 scale-95"
          }
        `}
      >
        <button
          onClick={() => {
            setLockEntry(true)
            setShowLoginBox(true)
          }}
          className="
            rounded-full border border-white/15 bg-white/10 px-8 py-4
            text-sm text-white/90 backdrop-blur-xl
            shadow-[0_0_40px_rgba(255,255,255,0.08)]
            transition hover:bg-white/15
          "
        >
          进入居民入口
        </button>
      </div>

      {/* 登录框 */}
      {showLoginBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl">
          <div
            className="
              w-[90%] max-w-md rounded-3xl border border-white/10
              bg-[#080808]/90 p-8 text-white
              shadow-[0_0_80px_rgba(255,255,255,0.08)]
              animate-in fade-in zoom-in-95 duration-700
            "
          >
            <p className="mb-2 text-xs tracking-[0.35em] text-white/40">
              小时代居民入口
            </p>

            <h2 className="mb-4 text-2xl font-light">
              回到你的深夜小屋
            </h2>

            <p className="mb-8 text-sm leading-7 text-white/50">
              游客可以短暂经过这里，但只有居民才能留下自己的故事、收藏、评论和生活痕迹。
            </p>

            <div className="space-y-3">
              <button className="w-full rounded-full bg-white py-3 text-sm text-black">
                登录
              </button>

              <button className="w-full rounded-full border border-white/15 py-3 text-sm text-white/70">
                注册成为居民
              </button>
            </div>

            <button
              onClick={() => {
                setShowLoginBox(false)
                setLockEntry(false)
              }}
              className="mt-6 w-full text-xs text-white/35"
            >
              继续以游客身份看看
            </button>
          </div>
        </div>
      )}
    </main>
  )
}