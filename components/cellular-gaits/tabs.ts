/**
 * Cellular Gaits — tab/route table. Single source of truth for the sub-route
 * nav. Each concept is its own deep-linkable route under
 * /projects/cellular-gaits/*. Order here is the reading order of the nav.
 */

export const CG_BASE = "/projects/cellular-gaits";

export type CgTab = {
  /** Full route path. */
  href: string;
  /** Short nav label. */
  label: string;
};

export const CG_TABS: CgTab[] = [
  { href: CG_BASE, label: "Frame" },
  { href: `${CG_BASE}/body`, label: "Body" },
  { href: `${CG_BASE}/controller`, label: "Controller" },
  { href: `${CG_BASE}/sensing`, label: "Sensing" },
  { href: `${CG_BASE}/mapping`, label: "Mapping" },
  { href: `${CG_BASE}/objective`, label: "Objective" },
  { href: `${CG_BASE}/optimizer`, label: "Optimizer" },
  { href: `${CG_BASE}/embodied`, label: "Embodied" },
  { href: `${CG_BASE}/behaviors`, label: "Behaviors" },
  { href: `${CG_BASE}/appendix`, label: "Appendix" },
];
