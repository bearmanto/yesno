"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getClient } from "@/utils/supabase/client";

export default function Header() {
  const supabase = getClient();
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!mounted) return;
      setEmail(u?.email ?? null);
      if (u?.id) {
        const { data: adminData } = await supabase.rpc("is_admin", { uid: u.id });
        if (mounted) setIsAdmin(Boolean(adminData));
      }
    })();
    return () => { mounted = false; };
  }, [supabase]);

  return (
    <header className="site-header">
      <nav className="nav">
        <Link className="link nav-link" href="/">Home</Link>
        <span className="sep">·</span>
        <Link className="link nav-link" href="/dashboard">Dashboard</Link>
        {isAdmin && (
          <>
            <span className="sep">·</span>
            <Link className="link nav-link" href="/admin">Admin</Link>
          </>
        )}
        <span className="spacer" />
        <span className="muted small">{email ?? "Guest"}</span>
      </nav>
    </header>
  );
}
