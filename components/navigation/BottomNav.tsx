"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Modern sticky bottom navigation
 * - Mobile-first (hidden on wide screens)
 * - Safe-area aware (iOS home indicator)
 * - Min tap height ~ 56px (>= WCAG 24px)
 * - Labels + icons
 */
export default function BottomNav() {
  const pathname = usePathname();
  const [hiddenForKeyboard, setHiddenForKeyboard] = useState(false);

  // Hide the bar when the software keyboard is open (best-effort)
  useEffect(() => {
    const onResize = () => {
      const vh = window.innerHeight;
      const sh = window.screen?.height || vh;
      setHiddenForKeyboard(vh < sh * 0.6);
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const items: { href: string; label: string; icon: string; exact?: boolean }[] = [
    { href: "/", label: "Home", icon: "/icons/home.svg", exact: true },
    { href: "/create", label: "Create", icon: "/icons/plus.svg" }, // floating action
    { href: "/dashboard", label: "Dashboard", icon: "/icons/dashboard.svg" },
    { href: "/favorites", label: "Favorites", icon: "/icons/star.svg" },
    { href: "/profile", label: "Profile", icon: "/icons/user.svg" },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav
      aria-label="Primary"
      className="bottomnav"
      style={{ transform: hiddenForKeyboard ? "translateY(110%)" : "translateY(0)" }}
    >
      <ul className="bottomnav-ul">
        {items.map((it, idx) => {
          const active = isActive(it.href, it.exact);
          if (idx === 1) {
            return (
              <li key={it.href} className="bottomnav-li center">
                <Link href={it.href} aria-label={it.label} className="fab">
                  <img src={it.icon} alt="" width={24} height={24} />
                </Link>
              </li>
            );
          }
          return (
            <li key={it.href} className="bottomnav-li">
              <Link
                href={it.href}
                className={`tab ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
                aria-label={it.label}
              >
                <img src={it.icon} alt="" width={24} height={24} />
                <span className="lbl">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <style>{`
        .bottomnav {
          position: sticky;
          bottom: 0; left: 0; right: 0;
          z-index: 50;
          padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
          background: rgba(255,255,255,0.9);
          backdrop-filter: saturate(150%) blur(8px);
          border-top: 1px solid #C9D7CB;
          transition: transform 200ms ease;
        }
        .bottomnav-ul {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: center;
          margin: 0; padding: 0; list-style: none;
          gap: 8px;
        }
        .bottomnav-li { display: grid; place-items: center; }
        .tab {
          display: grid; justify-items: center; gap: 4px;
          text-decoration: none; color: #344e41;
          font-size: 11px; line-height: 1.2;
          min-height: 56px; width: 100%;
          border-radius: 12px; padding: 8px 6px;
          transition: background 150ms ease, transform 120ms ease;
        }
        .tab.active { background: rgba(88,129,87,0.10); color: #3a5a40; }
        .tab:active { transform: scale(0.98); }
        .center { position: relative; }
        .fab {
          display: grid; place-items: center;
          width: 56px; height: 56px; border-radius: 16px;
          background: #588157;
          box-shadow: 0 6px 20px rgba(52,78,65,0.25);
          transition: transform 120ms ease, box-shadow 150ms ease, background 150ms ease;
        }
        .fab:active { transform: translateY(1px) scale(0.98); }
        .fab:focus-visible { outline: 2px solid #3a5a40; outline-offset: 2px; }
        @media (min-width: 1024px) { .bottomnav { display: none; } }
      `}</style>
    </nav>
  );
}
