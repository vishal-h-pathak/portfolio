import { HHTrace } from "./HHTrace";
import { Margin } from "./Margin";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";

export function Hero() {
  return (
    <Section
      id="about"
      hero
      margin={
        <Margin
          blocks={[
            { label: "ENTRY 042", body: "2026-04-30" },
            { label: "FILED UNDER", body: "about · thesis" },
            { label: "BASE", body: "Atlanta, GA" },
            {
              label: "LOOKING FOR",
              body: (
                <>
                  applied / agentic AI ·
                  <br />
                  forward-deployed / SE ·
                  <br />
                  mission-driven ML
                </>
              ),
            },
          ]}
        />
      }
    >
      <SectionHeader
        number="§ 1"
        label="THESIS"
        accent="green"
        as="h1"
        title={
          <>
            Electrical engineer in Atlanta, building{" "}
            <span className="accent-a">agentic systems</span> with an LLM in the
            loop. Ten years in{" "}
            <span className="accent-g">neuromorphic hardware</span>{" "}
            before this — memristors on a PCB, spikes on Loihi, neurons in VHDL
            — and it&rsquo;s still how I think about systems.
          </>
        }
      />
      <div className="thesis-cols">
        <p>
          This site is part working notebook, part workbench —{" "}
          <span className="accent-g">research on the left</span>,{" "}
          <span className="accent-a">builds on the right</span>. The notebook
          traces the through-line that got me here — neuromorphic hardware to
          now; the bench is what I build with agentic systems.
        </p>
        <p className="dim">
          Currently{" "}
          <span style={{ color: "var(--ink)" }}>
            Research Engineer at GTRI
          </span>{" "}
          — embedded ML, neuromorphic, computer vision. Looking for applied /
          agentic AI, forward-deployed / sales engineering, or mission-driven
          ML — somewhere doing something worth caring about.
        </p>
      </div>
      <div className="trace-card">
        <HHTrace />
        <div className="trace-cap">
          FIG.1 &nbsp; V_m vs. t &nbsp;·&nbsp; two action potentials,
          simulated
        </div>
      </div>
    </Section>
  );
}
