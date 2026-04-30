import type { Role } from "@/content/experience";

export function ExperienceEntry({ role }: { role: Role }) {
  return (
    <article className="exp-entry">
      <div className="when">
        {role.start} — {role.end}
        {role.current && (
          <div>
            <span className="now">CURRENT</span>
          </div>
        )}
      </div>
      <div>
        <h3>
          {role.title}
          <span className="sep"> &nbsp;·&nbsp; </span>
          <span className="org">{role.org}</span>
        </h3>
        <div className="tenure">
          {role.start} – {role.end === "now" ? "present" : role.end} ·{" "}
          {role.location}
        </div>
        {role.paragraphs.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
        <div className="exp-meta">
          {role.meta.map((m, i) => (
            <div key={i}>
              <div className="k">{m.key}</div>
              <div className="v">{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
