import { ReactNode } from "react";
import AdminGuard from "@/components/AdminGuard";
import AdminSidebar from "@/components/AdminSidebar";
import AdminTopbar from "@/components/AdminTopbar";
import styles from "./admin-layout.module.css";
import "./admin-console.css";

type Props = {
  children: ReactNode;
};

export default function AdminLayout({
  children,
}: Props) {
  return (
    <AdminGuard>
      <main className={`${styles.root} admin-console`}>
        <div className={styles.grid}>
          <AdminSidebar />
          <section className={styles.body}><AdminTopbar /><div className={`${styles.pageCanvas} admin-page-canvas`}>{children}</div></section>
        </div>
      </main>
    </AdminGuard>
  );
}
