import type { CoverageItem, NewQuestion } from "./types";
import { questions as domain1 } from "./domain-1";
import { questions as domain2 } from "./domain-2";
import { questions as domain3 } from "./domain-3";
import { questions as domain4 } from "./domain-4";
import { questions as domain5 } from "./domain-5";

export type { CoverageItem, NewQuestion } from "./types";

/**
 * New A+ Core 1 questions for the topics 220-1201 (V15) added, which our
 * 220-1101 bank doesn't cover, plus printer questions for the two objectives
 * the re-tagged bank leaves short. Sources: CompTIA's 220-1201 exam
 * objectives (version 4.0, the final document) compared with its 220-1101
 * objectives (version 1.0), and Professor Messer's list of the differences
 * between the two exams. The migration builder (scripts/a-plus-v15) reads
 * this export.
 */
export const CORE1_NEW_QUESTIONS: NewQuestion[] = [...domain1, ...domain2, ...domain3, ...domain4, ...domain5];

/** The topics 220-1201 added, from Professor Messer's comparison of 220-1101 and 220-1201. */
export const COVERAGE: CoverageItem[] = [
  { objective: "1.3", topic: "Wi-Fi data networks" },
  { objective: "1.3", topic: "SIM and eSIM" },
  { objective: "1.3", topic: "MDM device configurations" },
  { objective: "1.3", topic: "MDM policy enforcement" },
  { objective: "1.3", topic: "MDM business applications" },
  { objective: "2.2", topic: "6 GHz wireless band" },
  { objective: "2.2", topic: "channel selection" },
  { objective: "2.3", topic: "database servers" },
  { objective: "2.3", topic: "Network Time Protocol (NTP)" },
  { objective: "2.4", topic: "DHCP exclusions" },
  { objective: "2.5", topic: "physical media access control (MAC) address" },
  { objective: "3.1", topic: "Mini LED" },
  { objective: "3.1", topic: "pixel density" },
  { objective: "3.1", topic: "refresh rates" },
  { objective: "3.1", topic: "screen resolution" },
  { objective: "3.1", topic: "color gamut" },
  { objective: "3.2", topic: "USB-C video cables" },
  { objective: "3.5", topic: "microATX motherboards" },
  { objective: "3.5", topic: "BIOS temperature monitoring" },
  { objective: "3.6", topic: "energy efficiency" },
  { objective: "3.7", topic: "printer firmware" },
  { objective: "3.8", topic: "impact printer multipart paper" },
  { objective: "4.1", topic: "containers" },
  { objective: "4.1", topic: "hypervisor types (Type 1, Type 2)" },
  { objective: "4.2", topic: "ingress/egress metering" },
  { objective: "5.1", topic: "proprietary crash screens" },
  { objective: "5.2", topic: "drive array missing" },
  { objective: "5.2", topic: "audible alarms" },
  { objective: "5.3", topic: "display sizing issues" },
  { objective: "5.3", topic: "distorted images" },
  { objective: "5.4", topic: "unable to install new applications" },
  { objective: "5.4", topic: "stylus does not work" },
  { objective: "5.4", topic: "degraded performance" },
  { objective: "5.5", topic: "authentication failures" },
  { objective: "5.5", topic: "intermittent internet connectivity" },
  { objective: "5.6", topic: "tray not recognized" },
  { objective: "5.6", topic: "connectivity issues" },
  { objective: "5.6", topic: "frozen print queue" },
];

/**
 * Other sub-bullets that are new in CompTIA's 220-1201 document, compared
 * line by line with its 220-1101 one, which Messer's list doesn't name and
 * our 220-1101 bank has no questions on. Tethering (1.2), single-mode and
 * multimode fiber (3.2), RAID 6 (3.4) and subnet mask (2.6) are new bullets
 * too, but the bank already covers them.
 */
export const EXTRA_COVERAGE: CoverageItem[] = [
  { objective: "1.2", topic: "track points" },
  { objective: "2.4", topic: "CNAME records" },
  { objective: "3.4", topic: "Serial Attached SCSI (SAS)" },
  { objective: "3.5", topic: "BIOS password" },
  { objective: "4.2", topic: "multitenancy" },
  { objective: "4.2", topic: "shared vs. dedicated resources" },
];

/**
 * Topics 220-1201 kept from 220-1101, written because the re-tagged bank
 * leaves their objectives under the 12 active questions each one needs:
 * 3.7 at 10 and 3.8 at 5 (see src/data/a-plus-v15).
 */
export const TOP_UP_COVERAGE: CoverageItem[] = [
  { objective: "3.7", topic: "PCL vs. PostScript drivers" },
  { objective: "3.8", topic: "laser printer maintenance" },
  { objective: "3.8", topic: "inkjet printer maintenance" },
  { objective: "3.8", topic: "thermal printer maintenance" },
  { objective: "3.8", topic: "impact printer maintenance" },
];
