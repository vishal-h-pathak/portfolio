import { EXPERIENCE } from "@/content/experience";
import { ExperienceEntry } from "./ExperienceEntry";
import { Margin } from "./Margin";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";

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
      <SectionHeader
        number="§ 3"
        label="EXPERIENCE"
        title="Where the time went."
        status={{ tone: "green", label: "CURRENTLY AT GTRI", pulse: true }}
      />
      {EXPERIENCE.map((role) => (
        <ExperienceEntry key={role.org} role={role} />
      ))}
    </Section>
  );
}
