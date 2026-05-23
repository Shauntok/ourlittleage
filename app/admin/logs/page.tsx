import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";

function getActionStyle(action: string) {
  switch (action) {
    case "give_badge":
      return {
        label: "发放徽章",
        color:
          "bg-violet-500/15 text-violet-300 border-violet-500/30",
        icon: "🎖️",
      };

    case "remove_badge":
      return {
        label: "移除徽章",
        color:
          "bg-red-500/15 text-red-300 border-red-500/30",
        icon: "❌",
      };

    default:
      return {
        label: action,
        color:
          "bg-zinc-800 text-zinc-300 border-zinc-700",
        icon: "📄",
      };
  }
}

export default async function AdminLogsPage() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    redirect("/admin");
  }

  const { data: logs } = await supabase
    .from("admin_logs")
    .select(`
      *,
      profiles (
        username
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">
          操作日志 📜
        </h1>

        <p className="text-zinc-500 mt-2">
          记录后台管理员的所有重要操作。
        </p>
      </div>

      <div className="space-y-4">
        {logs?.length === 0 && (
          <p className="text-zinc-500">
            目前还没有日志。
          </p>
        )}

        {logs?.map((log: any) => {
          const actionStyle =
            getActionStyle(log.action);

          return (
            <div
              key={log.id}
              className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-5"
            >
              <div className="flex items-center justify-between gap-5">
                <div className="space-y-2">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold ${actionStyle.color}`}
                  >
                    <span>{actionStyle.icon}</span>
                    <span>{actionStyle.label}</span>
                  </div>

                  <p className="text-zinc-400 text-sm">
                    {log.details}
                  </p>

                  <p className="text-zinc-600 text-sm">
                    Admin：
                    {log.profiles?.username ||
                      "未知管理员"}
                  </p>
                </div>

                <div className="text-sm text-zinc-600">
                  {new Date(
                    log.created_at
                  ).toLocaleString("zh-CN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}