import { Bench } from "@/components/Bench";
import { Contact } from "@/components/Contact";
import { Experience } from "@/components/Experience";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { KbdHint } from "@/components/KbdHint";
import { Lineage } from "@/components/Lineage";
import { Nav } from "@/components/Nav";
import { Notebook } from "@/components/Notebook";
import { WorkshopRail } from "@/components/WorkshopRail";

// ISR: the workshop rail server-renders live jobpipe telemetry; 5 min
// staleness is acceptable there (matches /api/bench/activity).
export const revalidate = 300;

export default function Home() {
  return (
    <>
      <Nav />
      <div className="page">
        <Notebook>
          <Hero />
          <Lineage />
          <Experience />
          <Bench />
          <Contact />
        </Notebook>
        <WorkshopRail />
      </div>
      <Footer />
      <KbdHint />
    </>
  );
}
