export default function SettingsChangelogPage() {
  const logs = [
    {
      version: "Alpha 0.8.2",
      date: "2026.06.18",
      features: [
        "新增「关于网站」页面",
        "新增「更新日志」页面",
      ],
      fixes: [
        "修复已删除内容仍显示在广场的问题",
        "修复个人房间显示已删除文章的问题",
        "修复手机端编辑器提示卡遮挡问题",
        "修复多层弹窗层级异常",
      ],
      improvements: [
        "手机端编辑器改为提示按钮模式",
        "Alert 全面升级为 ConfirmDialog",
        "优化编辑器移动端体验",
      ],
    },

    {
      version: "Alpha 0.8.1",
      date: "2026.06.16",
      features: [
        "新增全站信件系统",
        "新增通知信箱",
        "新增世界公告",
      ],
      fixes: [
        "修复点赞通知异常",
        "修复成长记录写入问题",
        "修复注册后资料创建异常",
      ],
      improvements: [
        "优化管理后台布局",
        "优化草稿编辑流程",
      ],
    },

    {
      version: "Alpha 0.8.0",
      date: "2026.06.15",
      features: [
        "小时代 Alpha 正式开放测试",
        "开放文章、日记、房间系统",
        "开放居民成长与徽章系统",
      ],
      fixes: [],
      improvements: [],
    },
  ];

  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl md:p-10">
        <p className="text-xs tracking-[0.4em] text-white/25">
          CHANGELOG
        </p>

        <h1 className="mt-4 text-4xl font-light">
          更新日志
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/45">
          小时代会慢慢成长。
          这里记录每一次新增、修复与改变。
        </p>

        <div className="mt-10 space-y-8">
          {logs.map((log) => (
            <article
              key={log.version}
              className="rounded-[1.8rem] border border-white/10 bg-black/25 p-6"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-light">
                    {log.version}
                  </h2>

                  <p className="mt-2 text-sm text-white/35">
                    {log.date}
                  </p>
                </div>
              </div>

              {log.features.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-emerald-200">
                    ✨ 新功能
                  </h3>

                  <ul className="mt-3 space-y-2 text-sm leading-7 text-white/60">
                    {log.features.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {log.fixes.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-amber-200">
                    🛠 修复
                  </h3>

                  <ul className="mt-3 space-y-2 text-sm leading-7 text-white/60">
                    {log.fixes.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {log.improvements.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-sky-200">
                    🎨 优化
                  </h3>

                  <ul className="mt-3 space-y-2 text-sm leading-7 text-white/60">
                    {log.improvements.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}