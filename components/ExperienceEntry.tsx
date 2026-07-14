import { formatDateRange, type Role } from "@/content/experience";

export function ExperienceEntry({ role }: { role: Role }) {
  return (
    <article className="exp-entry">
      <div className="when">
        <span className="when-range">
          {formatDateRange(role.start, role.end)}
        </span>
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
          {formatDateRange(role.start, role.end)} · {role.location}
        </div>
        {role.paragraphs.map((para) => (
          <p key={para}>{para}</p>
        ))}
        <div className="exp-meta">
          {role.meta.map((m) => (
            <div key={m.key}>
              <div className="k">{m.key}</div>
              <div className="v">{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
