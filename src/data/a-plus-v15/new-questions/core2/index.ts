import { questions as domain1 } from "./domain-1";
import { questions as domain2 } from "./domain-2";
import { questions as domain3 } from "./domain-3";
import { questions as domain4 } from "./domain-4";
import type { CoverageTopic, NewQuestion } from "./types";

export type { CoverageTopic, NewQuestion } from "./types";

/** Every new 220-1202 question, Domain 1 first. scripts/a-plus-v15/build-migration.ts reads this name. */
export const CORE2_NEW_QUESTIONS: NewQuestion[] = [...domain1, ...domain2, ...domain3, ...domain4];

/**
 * The topics 220-1202 added that a bank written to 220-1102 doesn't cover. The
 * first group is Professor Messer's comparison of the two exams; the second is
 * sub-bullets of CompTIA's 220-1202 objectives document (Version 4.0) that his
 * list leaves out. Messer lists TPM and UEFI under 1.2, but CompTIA's document
 * puts them under 1.3, as Windows 11's hardware requirements.
 */
export const COVERAGE: CoverageTopic[] = [
  // Professor Messer's comparison of 220-1102 and 220-1202.
  { objective: "1.1", topic: "ReFS" },
  { objective: "1.1", topic: "XFS" },
  { objective: "1.2", topic: "multiboot" },
  { objective: "1.2", topic: "zero-touch deployment" },
  { objective: "1.3", topic: "TPM" },
  { objective: "1.3", topic: "UEFI" },
  { objective: "1.3", topic: "Windows 11 editions" },
  { objective: "1.5", topic: "whoami" },
  { objective: "1.8", topic: "macOS system folders" },
  { objective: "1.8", topic: "Rapid Security Response (RSR)" },
  { objective: "1.8", topic: "iCloud features" },
  { objective: "1.8", topic: "Continuity" },
  { objective: "1.9", topic: "fsck" },
  { objective: "1.9", topic: "mount" },
  { objective: "1.9", topic: "dnf" },
  { objective: "1.9", topic: "ping" },
  { objective: "1.9", topic: "curl" },
  { objective: "1.9", topic: "traceroute" },
  { objective: "1.9", topic: "du" },
  { objective: "1.9", topic: "common configuration files" },
  { objective: "1.9", topic: "systemd" },
  { objective: "1.9", topic: "kernel" },
  { objective: "1.9", topic: "bootloader" },
  { objective: "1.10", topic: "image deployment" },
  { objective: "1.11", topic: "cloud-based productivity tools" },
  { objective: "2.1", topic: "mobile digital keys" },
  { objective: "2.1", topic: "facial recognition" },
  { objective: "2.1", topic: "voice recognition" },
  { objective: "2.1", topic: "zero trust model" },
  { objective: "2.1", topic: "authentication methods" },
  { objective: "2.1", topic: "MDM" },
  { objective: "2.1", topic: "DLP" },
  { objective: "2.1", topic: "directory services" },
  { objective: "2.2", topic: "passwordless authentication" },
  { objective: "2.2", topic: "joining an Active Directory domain" },
  { objective: "2.4", topic: "stalkerware" },
  { objective: "2.4", topic: "fileless malware" },
  { objective: "2.4", topic: "PUP" },
  { objective: "2.4", topic: "EDR" },
  { objective: "2.4", topic: "MDR" },
  { objective: "2.4", topic: "XDR" },
  { objective: "2.4", topic: "email security gateway" },
  { objective: "2.5", topic: "QR code phishing" },
  { objective: "2.5", topic: "spear phishing" },
  { objective: "2.5", topic: "business email compromise (BEC)" },
  { objective: "2.5", topic: "supply chain attack" },
  { objective: "2.6", topic: "reimage/reinstall" },
  { objective: "2.7", topic: "password uniqueness" },
  { objective: "2.7", topic: "complexity" },
  { objective: "2.7", topic: "password managers" },
  { objective: "2.7", topic: "account expiration dates" },
  { objective: "2.7", topic: "disabling unused services" },
  { objective: "2.8", topic: "configuration profiles" },
  { objective: "2.8", topic: "application updates" },
  { objective: "2.8", topic: "content filtering" },
  { objective: "2.9", topic: "regulatory and environmental requirements" },
  { objective: "2.10", topic: "secure management access" },
  { objective: "2.11", topic: "browser patching" },
  { objective: "2.11", topic: "proxy" },
  { objective: "2.11", topic: "secure DNS" },
  { objective: "2.11", topic: "plug-ins" },
  { objective: "2.11", topic: "extensions" },
  { objective: "2.11", topic: "features" },
  { objective: "3.2", topic: "application fails to install" },
  { objective: "3.4", topic: "unwanted OS notifications" },
  { objective: "3.4", topic: "OS update failures" },
  { objective: "3.4", topic: "degraded browser performance" },
  { objective: "4.1", topic: "service level agreements" },
  { objective: "4.2", topic: "change management types" },
  { objective: "4.3", topic: "backup recovery" },
  { objective: "4.4", topic: "cable management" },
  { objective: "4.6", topic: "order of volatility" },
  { objective: "4.6", topic: "perpetual license agreement" },
  { objective: "4.6", topic: "NDA" },
  { objective: "4.9", topic: "SPICE" },
  { objective: "4.9", topic: "WinRM" },
  { objective: "4.10", topic: "basic AI concepts" },
  // New in CompTIA's 220-1202 objectives but missing from Messer's list.
  { objective: "1.3", topic: "N versions" },
  { objective: "1.9", topic: "root account" },
  { objective: "2.1", topic: "just-in-time access and PAM" },
  { objective: "2.1", topic: "IAM" },
  { objective: "2.2", topic: "moving objects within organizational units" },
  { objective: "2.4", topic: "adware" },
  { objective: "2.10", topic: "configuring guest access" },
  { objective: "3.4", topic: "inability to access files" },
  { objective: "4.1", topic: "CMDB" },
  { objective: "4.2", topic: "change freeze and maintenance windows" },
  { objective: "4.2", topic: "peer review" },
  { objective: "4.2", topic: "backup plan" },
];
