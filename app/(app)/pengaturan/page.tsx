"use client";

import { PageHeader } from "../_components/PageHeader";
import { useToast } from "../_components/toast-provider";
import { mockUser } from "@/app/lib/mock-user";

export default function SettingsPage() {
  const notify = useToast();

  return (
    <>
      <PageHeader eyebrow="YOUR ACCOUNT" title="Settings" copy="Shape Japanese Lingo Path around the way you learn." />
      <section className="settings-grid">
        <div className="settings-menu">{["Profile", "Learning preferences", "Daily goal", "Notifications", "Audio", "AI preferences", "Subscription"].map((item, index) => <button className={index === 0 ? "active" : ""} key={item}>{item}<span>→</span></button>)}</div>
        <div className="settings-form"><span className="card-kicker dark">PROFILE</span><div className="large-avatar">{mockUser.initials}</div><label>Display name<input defaultValue={mockUser.name} /></label><label>Native language<select defaultValue={mockUser.nativeLanguage}><option>Indonesian</option><option>English</option></select></label><label>Current goal<select defaultValue={mockUser.goal}><option>General Japanese</option><option>JLPT</option><option>Conversation</option></select></label><button className="primary-button" onClick={() => notify("Profile changes are ready to connect to account storage.")}>Save changes</button></div>
      </section>
    </>
  );
}
