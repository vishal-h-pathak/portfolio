import { Margin } from "./Margin";
import { Section } from "./Section";

export function Contact() {
  return (
    <Section
      id="contact"
      rowStyle={{ paddingBottom: "80px" }}
      margin={
        <Margin
          blocks={[
            { label: "§ 5", body: "CONTACT" },
            { label: "REPLY", body: "within 48h" },
          ]}
        />
      }
    >
      <div className="eyebrow dim">§ 5 &nbsp;·&nbsp; CONTACT</div>
      <h2 style={{ marginBottom: "22px" }}>Mail the lab.</h2>
      <a className="contact-mail" href="mailto:vishalp@thak.io">
        vishalp@thak.io
      </a>
      <p style={{ margin: "18px 0 0", maxWidth: "66ch", fontSize: "15px" }}>
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
        <a href="#" aria-label="Google Scholar">
          scholar
        </a>
      </div>
    </Section>
  );
}
