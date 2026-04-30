import { EXPERIENCE } from "@/content/experience";
import { ExperienceEntry } from "./ExperienceEntry";
import { Margin } from "./Margin";
import { Section } from "./Section";

export function Experience() {
  return (
    <Section
      id="experience"
      margin={
        <Margin
          blocks={[
            { label: "§ 3", body: "EXPERIENCE" },
            {
              label: "NOTE",
              body: "Paid work, in reverse chron. The bench section below is for personal builds — kept separate on purpose.",
            },
            {
              label: "FOOTNOTE",
              body: "The Loihi work and the Rain PCBs were team efforts. The connectome work is current and ongoing.",
            },
          ]}
        />
      }
    >
      <div className="sec-head">
        <div>
          <div className="eyebrow dim">§ 3 &nbsp;·&nbsp; EXPERIENCE</div>
          <h2>Where the time went.</h2>
        </div>
        <div className="status green">
          <span className="pulse" aria-hidden="true" />
          CURRENTLY AT GTRI
        </div>
      </div>
      {EXPERIENCE.map((role, i) => (
        <ExperienceEntry key={i} role={role} />
      ))}
    </Section>
  );
}
