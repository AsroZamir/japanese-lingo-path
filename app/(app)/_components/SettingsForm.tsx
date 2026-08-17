"use client";

import { useActionState, useEffect } from "react";
import { useToast } from "./toast-provider";
import { learningGoal } from "@/app/lib/mock-data";
import type { CurrentUser } from "@/app/lib/current-user";
import { updateProfile, type ProfileFormState } from "../pengaturan/actions";
import { Avatar } from "./AppShell";

const initialState: ProfileFormState = { status: "idle" };

export function SettingsForm({ user }: { user: CurrentUser }) {
  const notify = useToast();
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);

  useEffect(() => {
    if (state.status === "success") notify(state.message ?? "Perubahan tersimpan.");
  }, [state, notify]);

  return (
    <section className="settings-grid">
      <div className="settings-menu">{["Profile", "Learning preferences", "Daily goal", "Notifications", "Audio", "AI preferences", "Subscription"].map((item, index) => <button className={index === 0 ? "active" : ""} key={item}>{item}<span>→</span></button>)}</div>
      <form className="settings-form" action={formAction}>
        <span className="card-kicker dark">PROFILE</span>
        <div className="large-avatar"><Avatar user={user} /></div>
        <label>
          Display name
          <input name="display_name" defaultValue={user.name} />
          {state.fieldErrors?.display_name && <small style={{ color: "var(--red)" }}>{state.fieldErrors.display_name}</small>}
        </label>
        <label>
          Native language
          <select name="native_language" defaultValue={user.nativeLanguage}><option>Indonesian</option><option>English</option></select>
          {state.fieldErrors?.native_language && <small style={{ color: "var(--red)" }}>{state.fieldErrors.native_language}</small>}
        </label>
        <label>
          Current goal
          <select defaultValue={learningGoal}><option>General Japanese</option><option>JLPT</option><option>Conversation</option></select>
        </label>
        {state.status === "error" && state.message && <p style={{ color: "var(--red)" }}>{state.message}</p>}
        <button type="submit" className="primary-button" disabled={isPending}>{isPending ? "Saving…" : "Save changes"}</button>
      </form>
    </section>
  );
}
