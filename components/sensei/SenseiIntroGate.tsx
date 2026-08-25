"use client";

import { useEffect, useState } from "react";
import type { SenseiSegmentRow } from "@/app/lib/sensei-query";
import { SenseiBoard } from "./SenseiBoard";

// PROMPT-9 Bagian 4 — where module_intro / phase_intro+concept_moment
// segments actually get shown: as a dismissible overlay on first visit
// THIS SESSION (sessionStorage, not a DB flag — deliberately lightweight,
// matches VocalBridgeIntro's old "not persisted anywhere" precedent),
// always reopenable via a small button once dismissed. No segments ->
// renders nothing but children, so callers can pass an empty array
// safely for modules that don't have sensei content yet.
export function SenseiIntroGate({
  segments,
  storageKey,
  finishLabel,
  reopenLabel,
  children,
}: {
  segments: SenseiSegmentRow[];
  storageKey: string;
  finishLabel?: string;
  reopenLabel: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  // Genuine sync-from-external-system effect, not avoidable via a lazy
  // initializer: this component is part of a server-rendered tree, so
  // sessionStorage isn't available during SSR — same justification as
  // NarrationButton.tsx's identical pattern.
  useEffect(() => {
    if (segments.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above.
      setChecked(true);
      return;
    }
    let seen = false;
    try {
      seen = sessionStorage.getItem(storageKey) === "1";
    } catch {
      // Private mode / storage blocked — treat as not seen, just don't persist.
    }
    setOpen(!seen);
    setChecked(true);
  }, [segments.length, storageKey]);

  function dismiss() {
    setOpen(false);
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // Ignore — worst case it reopens next visit, not harmful.
    }
  }

  if (!checked) return <>{children}</>;

  return (
    <>
      {segments.length > 0 && (
        <button type="button" className="sensei-board__reopen" onClick={() => setOpen(true)}>
          ▶ {reopenLabel}
        </button>
      )}
      {open && segments.length > 0 && (
        <div className="sensei-overlay" role="dialog" aria-modal="true">
          <div className="sensei-overlay__panel">
            <SenseiBoard segments={segments} onFinish={dismiss} finishLabel={finishLabel} />
          </div>
        </div>
      )}
      {children}
    </>
  );
}
