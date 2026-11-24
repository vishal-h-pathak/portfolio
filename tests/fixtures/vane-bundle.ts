// Test helper only; never imported by app code. Loads the golden valid fixture.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const FIXTURE_DIR = join(__dirname, "vane");
export function makeBundle(): Record<string, any> {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, "export_v1_valid.json"), "utf8"));
}
