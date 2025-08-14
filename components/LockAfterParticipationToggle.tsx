"use client";

import { useState } from "react";
import { getClient } from "@/utils/supabase/client";
import { useToast } from "@/components/toast/ToastProvider";

export default function LockAfterParticipationToggle({
  surveyId,
  initial = false,
}: {
  surveyId: string;
  initial?: boolean;
}) {
  const supabase = getClient();
  const { push } = useToast();
  const [locked, setLocked] = useState<boolean>(!!initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("surveys")
        .update({ lock_after_participation: !locked })
        .eq("id", surveyId);
      if (error) { push(error.message, "error"); return; }
      setLocked(!locked);
      push(locked ? "Unlocked (multiple participations allowed)" : "Locked after first participation", "success");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row-actions" aria-label="Lock after participation">
      <button className="btn secondary" disabled={busy} onClick={toggle}>
        {locked ? "Disable one‑response lock" : "Enable one‑response lock"}
      </button>
      <span className="muted">
        {locked
          ? "Participants can’t vote again after their first vote on any question."
          : "Participants can vote on multiple questions; enable to restrict after first vote."}
      </span>
    </div>
  );
}
