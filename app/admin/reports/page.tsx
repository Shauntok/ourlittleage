"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);

  async function fetchReports() {
    const { data } = await supabase
      .from("reports")
      .select(`
        *,
        profiles (
          username
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    setReports(data || []);
  }

  useEffect(() => {
    fetchReports();
  }, []);

  async function updateStatus(
    reportId: string,
    status: string
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("reports")
      .update({
        status,
        handled_by: user?.id,
        handled_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (error) {
      alert(error.message);
      return;
    }

    await supabase.from("admin_logs").insert([
      {
        admin_id: user?.id,
        action: "update_report_status",
        target_type: "report",
        target_id: reportId,
        details: `举报状态修改为 ${status}`,
      },
    ]);

    fetchReports();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">
          举报中心 🚩
        </h1>

        <p className="text-zinc-500 mt-2">
          管理居民提交的举报内容。
        </p>
      </div>

      <div className="space-y-4">
        {reports.length === 0 && (
          <p className="text-zinc-500">
            目前没有举报。
          </p>
        )}

        {reports.map((report: any) => (
          <div
            key={report.id}
            className="rounded-3xl border border-zinc-800 bg-zinc-950/50 p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm text-red-300">
                  🚩 举报
                </div>

                <p className="text-zinc-400 text-sm">
                  举报人：
                  {report.profiles?.username ||
                    "未知居民"}
                </p>
              </div>

              <div className="text-sm text-zinc-600">
                {new Date(
                  report.created_at
                ).toLocaleString("zh-CN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-zinc-500 text-sm mb-1">
                  举报类型
                </p>

                <div className="flex items-center gap-3">
                    <p className="text-white">
                        {report.target_type}
                    </p>

                    {report.target_type === "post" && (
                        <a
                        href={`/admin/published`}
                        target="_blank"
                        className="
                            rounded-full
                            border
                            border-zinc-700
                            bg-zinc-900
                            px-3
                            py-1
                            text-xs
                            text-zinc-300
                            hover:border-white
                            hover:text-white
                            transition
                        "
                        >
                        查看文章 ↗
                        </a>
                    )}
                    </div>
              </div>

              <div>
                <p className="text-zinc-500 text-sm mb-1">
                  举报原因
                </p>

                <p className="text-white">
                  {report.reason}
                </p>
              </div>

              {report.details && (
                <div>
                  <p className="text-zinc-500 text-sm mb-1">
                    补充说明
                  </p>

                  <p className="text-zinc-300">
                    {report.details}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-sm text-yellow-300">
                {report.status}
              </span>

              <button
                onClick={() =>
                  updateStatus(report.id, "reviewed")
                }
                className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm text-blue-300 hover:bg-blue-500/20 transition"
              >
                标记审核
              </button>

              <button
                onClick={() =>
                  updateStatus(report.id, "resolved")
                }
                className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm text-green-300 hover:bg-green-500/20 transition"
              >
                已解决
              </button>

              <button
                onClick={() =>
                  updateStatus(report.id, "rejected")
                }
                className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800 transition"
              >
                驳回
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}