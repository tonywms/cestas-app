import type { ReactNode } from "react";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="admin-claude-theme min-h-screen">
      {children}
    </div>
  );
}
