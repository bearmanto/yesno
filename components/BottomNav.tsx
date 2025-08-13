"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

function Item({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: string; // simple emoji for now (no icon lib)
}) {
  return (
    <Link
      href={href}
      className="bn-item"
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      <span className="bn-icon" aria-hidden="true">{icon}</span>
      <span className="bn-label">{label}</span>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const supabase = getClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      setSignedIn(Boolean(token));
      if (token) {
        const { data: me } = await supabase.auth.getUser();
        const uid = me.user?.id ?? null;
        if (uid) {
          const { data: admin } = await supabase.rpc("is_admin", { uid });
          if (mounted) setIsAdmin(Boolean(admin));
        }
      }
    })();
    return () => { mounted = false; };
  }, [supabase]);

  return (
    <nav className="bn-root" role="navigation" aria-label="Primary">
      <Item href="/" label="Home" icon="🏠" active={pathname === "/"} />
      <Item href="/dashboard" label="Dashboard" icon="📋" active={pathname?.startsWith("/dashboard") ?? false} />
      {isAdmin ? (
        <Item href="/admin" label="Admin" icon="🛠️" active={pathname?.startsWith("/admin") ?? false} />
      ) : (
        <Item href="/signin" label={signedIn ? "Profile" : "Sign in"} icon="👤" active={pathname?.startsWith("/signin") ?? false} />
      )}
    </nav>
  );
}
