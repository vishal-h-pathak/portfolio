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
            { label: "§ 3", body: "EXPERIENCE", hideOnMobile: true },
            {
              label: "NOTE",
              body: "Professional experience, most recent first.",
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
      {EXPERIENCE.map((role) => (
        <ExperienceEntry key={role.org} role={role} />
      ))}
    </Section>
  );
}
