import { HHTrace } from "./HHTrace";
import { Margin } from "./Margin";
import { Section } from "./Section";

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
                  neuromorphic ·
                  <br />
                  mission-driven ML ·
                  <br />
                  SE at an AI co.
                </>
              ),
            },
          ]}
        />
      }
    >
      <div className="eyebrow">§ 1 &nbsp;·&nbsp; THESIS</div>
      <h1>
        Electrical engineer in Atlanta.{" "}
        <span className="accent-g">Neuromorphic hardware</span> for ten years
        — memristors on a PCB, spikes on Loihi, neurons in VHDL — and lately
        a lot of <span className="accent-a">agentic systems</span>, off-hours,
        with an LLM in the loop.
      </h1>
      <div className="thesis-cols">
        <p>
          This site is part working notebook, part workbench —{" "}
          <span className="accent-g">research on the left</span>,{" "}
          <span className="accent-a">builds on the right</span>. The notebook
          traces the through-line of neuromorphic work; the bench is what
          I&rsquo;ve been building on evenings and weekends to learn how
          agentic systems actually behave.
        </p>
        <p className="dim">
          Currently{" "}
          <span style={{ color: "var(--ink)" }}>
            Research Engineer at GTRI
          </span>{" "}
          — embedded ML, neuromorphic, computer vision. Looking for
          neuromorphic / mission-driven ML, or sales engineering at an AI
          company doing something worth caring about.
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
