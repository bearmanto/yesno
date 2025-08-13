"use client";

import { useEffect, useState } from "react";
import FilterControls from "@/components/dashboard/FilterControls";
import FilteredList from "@/components/dashboard/FilteredList";

export default function DashboardPage() {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("new");

  // If we ever pass undo params again, strip them:
  useEffect(() => {
    const url = new URL(location.href);
    if (url.searchParams.has("undo")) {
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  return (
    <main className="container">
      <h1>Dashboard</h1>
      <FilterControls
        filter={filter}
        sort={sort}
        onChange={(n) => {
          if (n.filter) setFilter(n.filter);
          if (n.sort) setSort(n.sort);
        }}
      />
      <FilteredList filter={filter} sort={sort} />
      <div style={{ height: 64 }} /> {/* Spacer so content isn't hidden behind bottom nav */}
    </main>
  );
}
