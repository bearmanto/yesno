"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getClient } from "@/utils/supabase/client";

export default function AuthStatus() {
  const supabase = getClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
    })();
    return () => { mounted = false; };
  }, [supabase]);

  if (email) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span>Signed in as {email}</span>
        <Link href="/dashboard">Dashboard</Link>
      </div>
    );
  }
  return <Link href="/signin">Sign in</Link>;
}
