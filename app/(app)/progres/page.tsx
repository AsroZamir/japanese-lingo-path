import { PageHeader } from "../_components/PageHeader";

const skills = [
  ["Vocabulary", 42, "+8%"],
  ["Grammar", 31, "+5%"],
  ["Kanji", 24, "+4%"],
  ["Reading", 18, "+3%"],
  ["Listening", 12, "New"],
];

export default function ProgressPage() {
  return (
    <>
      <PageHeader eyebrow="YOUR DEVELOPMENT" title="Progress" copy="See what is improving and where to focus next." />
      <section className="metric-grid"><div><small>STUDY TIME</small><strong>3h 42m</strong><span>This month</span></div><div><small>LESSONS</small><strong>8</strong><span>Completed</span></div><div><small>ACCURACY</small><strong>76%</strong><span>All practice</span></div><div><small>STREAK</small><strong>7 days</strong><span>Personal best</span></div></section>
      <section className="progress-layout"><div className="table-card"><div className="table-title"><div><span className="card-kicker dark">SKILL MAP</span><h3>Your current foundation</h3></div></div>{skills.map(([skill, value, change]) => <div className="skill-row" key={skill}><strong>{skill}</strong><span><i style={{ width: `${value}%` }}></i></span><b>{value}%</b><small>{change}</small></div>)}</div><aside className="insight-card"><span>✦ AI INSIGHT</span><h3>Your path is just beginning</h3><p>Once more activity is collected, personalized observations and recommendations will appear here.</p><div className="insight-placeholder"><i></i><i></i><i></i></div></aside></section>
    </>
  );
}
