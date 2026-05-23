import { ReactNode } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminSidebar from "@/components/AdminSidebar";

type Props = {
  children: ReactNode;
};

export default function AdminLayout({
  children,
}: Props) {
  return (
    <AdminGuard>
      <main className="min-h-screen bg-black text-white px-6 py-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
          <AdminSidebar />

          <section>
            {children}
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}