import { Margin } from "./Margin";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";

export function Contact() {
  return (
    <Section
      id="contact"
      margin={
        <Margin
          blocks={[
            { label: "§ 5", body: "CONTACT", hideOnMobile: true },
            { label: "REPLY", body: "within 48h" },
          ]}
        />
      }
    >
      <SectionHeader number="§ 5" label="CONTACT" title="Mail the lab." />
      <a className="contact-mail" href="mailto:vishalp@thak.io">
        vishalp@thak.io
      </a>
      <p className="contact-note">
        Atlanta-based, remote-friendly. Open to neuromorphic / connectomics /
        mission-driven ML, or sales engineering at an AI company doing
        something I&rsquo;d actually use.
      </p>
      <div className="social-row">
        <a
          href="https://github.com/vishal-h-pathak"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          github
        </a>
        <a
          href="https://www.linkedin.com/in/vishalhpathak/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
        >
          linkedin
        </a>
      </div>
    </Section>
  );
}
