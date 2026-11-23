import { describe, expect, it } from "vitest";
import { PATH_CONTENT, type PathContent } from "../index";
import { SY0_801_PATH_CONTENT } from "../security-plus-sy0-801";
import type { AuthoredRep } from "../types";
import { authoredRepId } from "@/core/path/rep-id";
import { wordCount } from "@/core/path/text";

/**
 * How every hand-written question on the study path is worded. The SY0-701
 * objective pages play these questions too, so a visitor reads them before
 * there is any account.
 *
 * - A prompt is a complete question. A prompt that stops on an ellipsis for the
 *   options to complete ("It is a...") is not one, and the house style allows no
 *   ellipsis anywhere.
 * - An explanation (the takeaway) is one or two complete sentences. A label
 *   joined to a fragment by a colon ("Zero-day: the vendor has had zero days to
 *   fix it.") is a note, not a sentence.
 * - Rewording a question never changes what it asks: every rep keeps its id,
 *   under which progress is stored, and its correct answer.
 */

const ELLIPSIS = String.fromCharCode(0x2026);

// Every exam on the study path, plus Security+ SY0-801 if it is not yet among them.
const CONTENT: [string, PathContent][] = Object.entries(PATH_CONTENT);
if (!CONTENT.some(([cert]) => cert === "security-plus-sy0-801")) {
  CONTENT.push(["security-plus-sy0-801", SY0_801_PATH_CONTENT]);
}

const repsOf = (content: PathContent): AuthoredRep[] => [...content.authored, ...(content.warmup.authored ?? [])];
const answerOf = (r: AuthoredRep) => (r.kind === "typed" ? r.answer : r.options[0]);
const hasEllipsis = (text: string) => text.includes(ELLIPSIS) || text.includes("...");

/** What keeps a prompt from being a complete question; nothing when it is one. */
function promptFaults(prompt: string): string[] {
  const found: string[] = [];
  if (hasEllipsis(prompt)) found.push("has an ellipsis");
  if (!prompt.trim().endsWith("?")) found.push("is not a question");
  return found;
}

/** What keeps an explanation from being one or two complete sentences; nothing when it is. */
function sentenceFaults(takeaway: string): string[] {
  const found: string[] = [];
  if (hasEllipsis(takeaway)) found.push("has an ellipsis");
  // A colon or an equals sign is how a note joins a label to a fragment; a sentence uses a verb.
  if (/[:=]/.test(takeaway)) found.push("joins a label to a fragment");
  // An explanation states the reason; it does not ask or exclaim.
  if (/[?!]/.test(takeaway)) found.push("asks or exclaims");
  const sentences = takeaway.trim().split(/(?<=\.)\s+(?=[A-Z0-9])/);
  if (sentences.length > 2) found.push(`has ${sentences.length} sentences`);
  for (const sentence of sentences) {
    if (!/^[A-Z0-9]/.test(sentence)) found.push(`does not begin with a capital: "${sentence}"`);
    if (!/[A-Za-z0-9)]\.$/.test(sentence)) found.push(`does not end with a full stop: "${sentence}"`);
    if (wordCount(sentence) < 3) found.push(`has a note where a sentence belongs: "${sentence}"`);
  }
  return found;
}

describe("wording of the study path's hand-written questions", () => {
  for (const [cert, content] of CONTENT) {
    const reps = repsOf(content);
    if (reps.length === 0) continue;

    describe(cert, () => {
      it("asks every prompt as a complete question, with no ellipsis", () => {
        for (const r of reps) expect(promptFaults(r.prompt), `${r.key}: ${r.prompt}`).toEqual([]);
      });

      it("prints no ellipsis in an option or in a typed answer's cue", () => {
        for (const r of reps) {
          const parts = r.kind === "typed" ? [r.cue, r.answer] : [...r.options];
          for (const part of parts) expect(hasEllipsis(part), `${r.key}: ${part}`).toBe(false);
        }
      });

      it("explains every answer in one or two complete sentences", () => {
        for (const r of reps) expect(sentenceFaults(r.takeaway), `${r.key}: ${r.takeaway}`).toEqual([]);
      });
    });
  }

  it("covers both Security+ exams, so the checks above are not empty", () => {
    const written = CONTENT.filter(([, content]) => repsOf(content).length > 0).map(([cert]) => cert);
    expect(written).toContain("security-plus-sy0-701");
    expect(written).toContain("security-plus-sy0-801");
  });

  describe("the check itself", () => {
    it("refuses the fill-in prompt that the questions replaced, and passes its question", () => {
      const before = `Malware spreads from computer to computer across the network with no user action. It is a${ELLIPSIS}`;
      expect(promptFaults(before)).toEqual(["has an ellipsis", "is not a question"]);
      expect(promptFaults("Malware spreads from computer to computer across the network with no user action. Which type of malware is this?")).toEqual([]);
    });

    it("passes an explanation written as sentences", () => {
      expect(sentenceFaults("A zero-day is so called because the vendor has had zero days to fix it.")).toEqual([]);
      expect(sentenceFaults("802.1X is port-based network access control, usually with EAP and RADIUS.")).toEqual([]);
      expect(sentenceFaults("Fail-closed favors security. Fail-open favors availability.")).toEqual([]);
      // A semicolon between two clauses still makes one sentence.
      expect(sentenceFaults("Business continuity keeps the organization working; disaster recovery restores the IT systems it depends on.")).toEqual([]);
    });

    const refused: [what: string, takeaway: string, fault: RegExp][] = [
      ["a label and a fragment", "Zero-day: the vendor has had zero days to fix it.", /joins a label to a fragment/],
      ["three labelled fragments", "Cold site: space and power. Warm site: some equipment. Hot site: ready to take over.", /has 3 sentences/],
      ["a formula", "SLE = asset value × exposure factor. ALE = SLE × ARO.", /joins a label to a fragment/],
      ["a question inside", "Zero Trust checks the device: is it known, managed and healthy? A stolen password alone is not enough.", /asks or exclaims/],
      ["a note of two words", "Higher wins.", /a note where a sentence belongs: "Higher wins\."/],
      ["an ellipsis", `The vendor has had zero days to fix it${ELLIPSIS}`, /has an ellipsis/],
      ["no full stop", "Downtime is an availability problem", /does not end with a full stop/],
    ];
    it.each(refused)("refuses %s", (_what, takeaway, fault) => {
      expect(sentenceFaults(takeaway).join("; ")).toMatch(fault);
    });
  });
});

describe("ids and correct answers", () => {
  for (const [cert, manifest] of Object.entries(idsAndAnswers())) {
    it(`${cert}: keeps every rep's id and correct answer`, () => {
      const content = CONTENT.find(([c]) => c === cert)?.[1];
      expect(content, cert).toBeDefined();
      const before = new Map<string, string>();
      for (const line of manifest.split("\n")) {
        if (!line.trim()) continue;
        const [objective, key, ...answer] = line.trim().split("|");
        before.set(authoredRepId(objective, key), answer.join("|"));
      }
      const now = new Map(repsOf(content!).map((r) => [authoredRepId(r.objective, r.key), answerOf(r)]));
      expect([...now.keys()].sort()).toEqual([...before.keys()].sort());
      for (const [id, answer] of before) expect(now.get(id), id).toBe(answer);
    });
  }
});

/**
 * Every rep's id and correct answer as they stood on 23 November 2026, when the
 * prompts that ended on an ellipsis were rewritten as questions: one line per
 * rep, "objective|key|correct answer". A rep's id (a|objective|key, built by
 * authoredRepId) is the key its progress is stored under, so an id never
 * changes and a reworded question keeps its answer. A new rep is added to this
 * list in the change that writes it.
 */
function idsAndAnswers(): Record<string, string> {
  return {
    "security-plus-sy0-701": `
1.1|1.1a|Technical
1.1|1.1b|Managerial
1.1|1.1c|Operational
1.1|1.1d|Physical
1.1|1.1e|Detective
1.1|1.1f|Deterrent
1.1|1.1g|Compensating
1.2|1.2a|Availability
1.2|1.2b|Non-repudiation
1.2|1.2c|Accounting
1.2|1.2d|Policy engine
1.2|1.2e|Honeypot
1.2|1.2f|Honeytoken
1.2|1.2g|Access control vestibule
1.2|w3|Integrity
1.3|1.3a|Backout plan
1.3|1.3b|Maintenance window
1.3|1.3c|Impact analysis
1.3|1.3d|Owner
1.3|1.3e|Dependencies
1.3|1.3f|Version control
1.3|1.3g|Network diagrams
1.4|1.4a|Asymmetric
1.4|1.4b|Bob's public key
1.4|1.4c|Salting
1.4|1.4d|TPM
1.4|1.4e|Tokenization
1.4|1.4f|OCSP
1.4|1.4g|Wildcard
1.4|w6|Symmetric
2.1|2.1a|Nation-state
2.1|2.1b|Hacktivist
2.1|2.1c|Unskilled attacker
2.1|2.1d|Shadow IT
2.1|2.1e|Financial gain
2.1|2.1f|Insider threat
2.1|2.1g|Espionage
2.2|2.2a|Vishing
2.2|2.2b|Typosquatting
2.2|2.2c|Watering hole attack
2.2|2.2d|Business email compromise
2.2|2.2e|Removable device
2.2|2.2f|Default credentials
2.2|2.2g|Supply chain
2.2|w5|Smishing
2.3|2.3a|SQL injection
2.3|2.3b|Cross-site scripting
2.3|2.3c|Buffer overflow
2.3|2.3d|Time-of-check to time-of-use
2.3|2.3e|VM escape
2.3|2.3f|Zero-day
2.3|2.3g|Side loading
2.4|2.4a|Worm
2.4|2.4b|Trojan
2.4|2.4c|Logic bomb
2.4|2.4d|Impossible travel
2.4|2.4e|Directory traversal
2.4|2.4f|Replay attack
2.4|2.4g|Downgrade attack
2.4|w8|Password spraying
2.5|2.5a|An application allow list
2.5|2.5b|Segmentation
2.5|2.5c|Decommissioning
2.5|2.5d|HIPS
2.5|2.5e|Hardening
2.5|2.5f|Isolation
2.5|2.5g|Configuration enforcement
3.1|3.1a|The customer
3.1|3.1b|Infrastructure as code
3.1|3.1c|ICS/SCADA
3.1|3.1d|Air-gapped
3.1|3.1e|Serverless
3.1|3.1f|A real-time operating system
3.1|3.1g|Software-defined networking
3.2|3.2a|Jump server
3.2|3.2b|Web application firewall
3.2|3.2c|Fail-closed
3.2|3.2d|802.1X
3.2|3.2e|Passively
3.2|3.2f|VPN
3.2|3.2g|SASE
3.3|3.3a|At rest
3.3|3.3b|Data masking
3.3|3.3c|Data sovereignty
3.3|3.3d|Trade secrets
3.3|3.3e|In transit
3.3|3.3f|Geographic restriction
3.3|3.3g|Regulated
3.4|3.4a|Cold site
3.4|3.4b|UPS
3.4|3.4c|Tabletop exercise
3.4|3.4d|Load balancing
3.4|3.4e|Geographic dispersion
3.4|3.4f|Snapshot
3.4|3.4g|Platform diversity
4.1|4.1a|BYOD
4.1|4.1b|COPE
4.1|4.1c|A heat map
4.1|4.1d|WPA3
4.1|4.1e|Input validation
4.1|4.1f|Code signing
4.1|4.1g|Sandboxing
4.2|4.2a|Sanitization
4.2|4.2b|Destruction
4.2|4.2c|Certification
4.2|4.2d|Enumeration
4.2|4.2e|Ownership
4.2|4.2f|Acquisition and procurement
4.2|4.2g|Data retention
4.3|4.3a|False positive
4.3|4.3b|CVSS
4.3|4.3c|Bug bounty program
4.3|4.3d|Static analysis
4.3|4.3e|Rescanning
4.3|4.3f|The dark web
4.3|4.3g|An exception
4.4|4.4a|SIEM
4.4|4.4b|DLP
4.4|4.4c|An SNMP trap
4.4|4.4d|NetFlow
4.4|4.4e|Alert tuning
4.4|4.4f|SCAP
4.4|4.4g|Archiving
4.5|4.5a|SPF
4.5|4.5b|DKIM
4.5|4.5c|636
4.5|4.5d|Screened subnet
4.5|4.5e|File integrity monitoring
4.5|4.5f|NAC
4.5|4.5g|SFTP
4.5|w1|22
4.5|w2|HTTPS
4.6|4.6a|Single sign-on
4.6|4.6b|Role-based
4.6|4.6c|Discretionary
4.6|4.6d|Mandatory
4.6|4.6e|Something you are
4.6|4.6f|Just-in-time permissions
4.6|4.6g|OAuth
4.6|w4|Least privilege
4.6|w7|Multifactor authentication
4.7|4.7a|User provisioning
4.7|4.7b|Guard rails
4.7|4.7c|Ticketing and escalation
4.7|4.7d|Continuous integration
4.7|4.7e|Single point of failure
4.7|4.7f|Technical debt
4.7|4.7g|Security Orchestration, Automation, and Response
4.8|4.8a|Eradication
4.8|4.8b|Containment
4.8|4.8c|Chain of custody
4.8|4.8d|Legal hold
4.8|4.8e|Threat hunting
4.8|4.8f|Lessons learned
4.8|4.8g|Memory (RAM)
4.9|4.9a|Packet capture
4.9|4.9b|Metadata
4.9|4.9c|Firewall log
4.9|4.9d|Security log
4.9|4.9e|Vulnerability scans
4.9|4.9f|Endpoint log
4.9|4.9g|Dashboard
5.1|5.1a|Acceptable use policy
5.1|5.1b|Playbook
5.1|5.1c|Standard
5.1|5.1d|Controller
5.1|5.1e|Processor
5.1|5.1f|Custodian
5.1|5.1g|Offboarding
5.2|5.2a|SLE × ARO
5.2|5.2b|Transfer
5.2|5.2c|Avoid
5.2|5.2d|Recovery time objective
5.2|5.2e|Recovery point objective
5.2|5.2f|Qualitative
5.2|5.2g|Risk register
5.3|5.3a|SLA
5.3|5.3b|Right-to-audit clause
5.3|5.3c|Memorandum of understanding
5.3|5.3d|NDA
5.3|5.3e|Statement of work
5.3|5.3f|Rules of engagement
5.3|5.3g|Due diligence
5.4|5.4a|Right to be forgotten
5.4|5.4b|Data subject
5.4|5.4c|Attestation
5.4|5.4d|Loss of license
5.4|5.4e|HIPAA
5.4|5.4f|Data inventory
5.4|5.4g|Internal reporting
5.5|5.5a|Unknown environment
5.5|5.5b|Passive reconnaissance
5.5|5.5c|Active reconnaissance
5.5|5.5d|Physical
5.5|5.5e|Independent third-party audit
5.5|5.5f|Integrated testing
5.5|5.5g|Self-assessment
5.6|5.6a|Phishing campaign
5.6|5.6b|Report it to security
5.6|5.6c|Unintentional
5.6|5.6d|Hybrid and remote work
5.6|5.6e|Operational security
5.6|5.6f|At hire, then on a recurring schedule
5.6|5.6g|Report it as a possible insider threat
`,
    "security-plus-sy0-801": `
1.1|1.1a|Technical
1.1|1.1b|Managerial
1.1|1.1c|Operational
1.1|1.1d|Physical
1.1|1.1e|Detective
1.1|1.1f|Deterring
1.1|1.1g|Compensating
1.1|1.2a|Availability
1.1|1.2b|Non-repudiation
1.1|1.2c|Accounting
1.1|defense-in-depth|Defense in depth
1.1|w3|Integrity
1.1|w4|Least privilege
1.1|zero-trust|Zero Trust
1.2|1.3a|Backout plan
1.2|1.3b|Maintenance window
1.2|1.3c|Impact analysis
1.2|1.3d|Owner
1.2|1.3e|Dependencies
1.2|1.3f|Version control
1.2|1.3g|Network diagrams
1.2|cab|Change advisory board
1.2|fail-forward|Fail forward
1.2|legacy-apps|Legacy applications
1.2|restarts|Restarting the service
1.2|restricted-activities|Restricted activities
1.3|1.4a|Asymmetric
1.3|1.4b|Bob's public key
1.3|1.4c|Salting
1.3|1.4d|TPM
1.3|1.4f|OCSP
1.3|1.4g|Wildcard
1.3|csr|Certificate signing request
1.3|full-disk|Full disk
1.3|key-exchange|Diffie-Hellman key exchange
1.3|record-level|Record
1.3|root-of-trust|Root of trust
1.3|self-signed|No trusted CA signed it
1.3|w6|Symmetric
2.1|4.3b|CVSS
2.1|4.3f|The dark web
2.1|cve|A unique public identifier
2.1|cwe|CWE
2.1|intel-cycle|Analysis
2.1|likelihood-impact|High impact, low likelihood
2.1|osint|Open-source intelligence (OSINT)
2.1|prioritization|The internet-facing one being exploited
2.1|threat-feeds|Threat feed
2.2|2.1a|State-sponsored (nation-state)
2.2|2.1b|Hacktivist
2.2|2.1c|Unskilled attacker
2.2|2.1e|Financial gain
2.2|2.1f|Insider threat
2.2|2.1g|Espionage
2.2|accidental|Accidental or unintentional
2.2|competitor|Competitor
2.2|ideological|Ideological
2.2|resources-funding|Resources and funding
2.2|terrorist|Terrorist
2.3|1.2g|Access control vestibule
2.3|2.2c|Watering hole attack
2.3|2.2e|External media-based
2.3|2.2g|Supply chain
2.3|browser-extension|Browser-based
2.3|collab-tools|Collaboration tools
2.3|fake-captcha|A fake CAPTCHA
2.3|iot|IoT-based
2.3|lock-and-key|Physical-based
2.3|logistics|Supply chain-based
2.3|lotl|Living off the land
2.3|nfc|Signal-based
2.3|qr-code|Image-based
2.3|rcs|Message-based
2.3|rtf-pdf|Attachment-based
2.3|session-token|Session token
2.3|vnc|Remote access
2.4|2.1d|Shadow IT
2.4|2.2f|Misconfiguration
2.4|2.3d|Time-of-check to time-of-use
2.4|2.3e|VM escape
2.4|2.3f|Zero-day
2.4|2.3g|Side loading
2.4|hardcoded-secrets|Hardcoded secret
2.4|identity-provider|Compromising it opens every app
2.4|llm-surface|Large language model (LLM)
2.4|low-power-wireless|Read and spoof their messages
2.4|malicious-update|Malicious updates
2.4|public-object-storage|Public object storage
2.4|public-repo|Public repository
2.4|rogue-device|A rogue device
2.4|stale-credentials|Stale credentials
2.4|unsafe-exceptions|Unsafe exception handling
2.5|2.2a|Vishing
2.5|2.2b|Typosquatting
2.5|2.2d|Business email compromise
2.5|2.3a|SQL injection
2.5|2.3b|Cross-site scripting
2.5|2.3c|Buffer overflow
2.5|2.4a|Worm
2.5|2.4b|Trojan
2.5|2.4c|Logic bomb
2.5|2.4d|Impossible travel
2.5|2.4e|Directory traversal
2.5|2.4f|Replay attack
2.5|2.4g|Downgrade attack
2.5|adware|Adware
2.5|cache-poisoning|DNS cache poisoning
2.5|concurrent-sessions|Concurrent sessions
2.5|deepfake|A deepfake
2.5|fileless|Fileless malware
2.5|forced-entry|Forced entry
2.5|log-manipulation|Log manipulation
2.5|mfa-bypass|MFA fatigue (an MFA bypass)
2.5|plaintext-strings|Plaintext strings
2.5|quishing|Quishing
2.5|skimming|Skimming
2.5|sniffing|Sniffing
2.5|user-enumeration|User enumeration
2.5|w5|Smishing
2.5|w8|Password spraying
2.6|ai-code-execution|Code execution
2.6|ai-data-loss|Data loss
2.6|ai-ethics|Ethical considerations
2.6|ai-privacy|Privacy
2.6|ai-session-hijacking|Session hijacking
2.6|bias|Bias
2.6|evasion|Evasion
2.6|explainability|Explainability
2.6|hallucination|Hallucination
2.6|jailbreaking|Jailbreaking
2.6|model-manipulation|Model manipulation
2.6|poisoning|Poisoning
2.6|prompt-injection|Prompt injection
2.6|w-ai|Prompt injection
3.1|3.1a|The customer
3.1|3.1b|Infrastructure as code
3.1|3.1c|Operational technology (OT)
3.1|3.1d|Air-gapped
3.1|3.1e|Serverless
3.1|3.3c|Data sovereignty
3.1|classification-business|Data classification
3.1|community-cloud|Community
3.1|multicloud|Multicloud
3.1|open-source|Anyone can inspect the code
3.1|segmentation-types|Physical segmentation
3.1|usability|Usability
3.2|3.2a|Jump server
3.2|3.2c|Fail-closed
3.2|3.2f|VPN
3.2|3.2g|Security service edge (SSE)
3.2|4.5d|Screened subnet
3.2|4.5g|SFTP
3.2|diversity|Vendor diversity
3.2|e2ee-messaging|End-to-end encryption
3.2|gmsa|A group managed service account
3.2|out-of-band|Out-of-band management
3.2|privilege-creep|Privilege creep
3.2|security-zones|Security zones
3.2|w1|22
3.2|zt-device-health|Device health and inventory
3.3|1.4e|Tokenization
3.3|3.3a|At rest
3.3|3.3b|Data masking
3.3|3.3d|Intellectual property
3.3|3.3e|In transit
3.3|3.3f|Geofencing
3.3|3.3g|Health data
3.3|5.1d|Controller
3.3|5.1f|Custodian
3.3|child-data|Child or minor data
3.3|data-life-cycle|Distribution
3.3|data-operator|Data operators
3.3|data-steward|Data steward
3.3|data-transpose|Data transpose
3.3|deidentification|Deidentification
3.3|filtering|Filtering
3.3|marking-labeling|Marking and labeling
3.3|structured|Emails, PDFs and images
3.3|subprocessor|Subprocessor
3.4|3.4a|Cold site
3.4|3.4b|UPS
3.4|3.4d|Load balancing
3.4|3.4g|Platform diversity
3.4|5.2d|Recovery time objective
3.4|5.2e|Recovery point objective
3.4|autoscaling|Autoscaling
3.4|capacity-planning|Capacity planning
3.4|immutable-backups|Immutable backups
3.4|mtbf|Mean time between failures
3.4|mttr|Mean time to repair
3.4|redundant-power-supply|Redundant power supplies
3.4|restoration-testing|Restoration testing
3.4|surge-protector|Surge protector
4.1|1.2e|Honeypot
4.1|1.2f|Honeytoken
4.1|2.5a|An application allow list
4.1|2.5b|Segmentation
4.1|2.5d|HIPS
4.1|2.5e|Hardening
4.1|3.2b|Web application firewall
4.1|3.2d|802.1X
4.1|4.1e|Input validation
4.1|4.1f|Code signing
4.1|4.1g|Sandboxing
4.1|4.5a|SPF
4.1|4.5b|DKIM
4.1|4.5e|File integrity monitoring
4.1|4.5f|NAC
4.1|bimi|BIMI
4.1|canary-account|Canary account
4.1|captive-portal|Captive portal
4.1|dmarc|DMARC
4.1|endpoint-posture|Endpoint posture
4.1|group-policy|Group Policy
4.1|honeynet|Honeynet
4.1|rate-limiting|Rate limiting
4.1|secrets-scanning|Secrets scanning
4.1|selinux|SELinux
4.1|utm|Unified threat management (UTM)
4.1|wips|WIPS
4.1|xdr|XDR
4.2|2.5c|Decommissioning
4.2|4.2a|Sanitization
4.2|4.2b|Destruction
4.2|4.2c|Certification
4.2|4.2d|Enumeration
4.2|4.2e|Ownership
4.2|4.2f|Acquisition and procurement
4.2|4.2g|Data retention
4.2|planning-scoping|Planning and scoping
4.3|4.3a|False positive
4.3|4.3c|Bug bounty program
4.3|4.3d|Static analysis
4.3|4.3e|Rescanning
4.3|cspm|CSPM
4.3|ipam|Unknown, unmanaged devices
4.3|pentest-report|Proven exploitable on critical systems
4.3|responsible-disclosure|Responsible disclosure
4.3|source-code-review|Source code review
4.4|3.2e|Port mirroring
4.4|4.4a|SIEM
4.4|4.4b|DLP
4.4|4.4c|An SNMP trap
4.4|4.4d|NetFlow
4.4|4.4e|Alert tuning
4.4|4.4f|SCAP
4.4|4.4g|Archiving
4.4|agentless|Agentless monitoring
4.4|dashboards|Spotting problems at a glance, live
4.4|nms|Network management system
4.4|packet-analyzer|Packet analyzer
4.4|syslog|Syslog
4.5|4.5c|636
4.5|4.6a|Single sign-on
4.5|4.6b|Role-based
4.5|4.6c|Discretionary
4.5|4.6d|Mandatory
4.5|4.6e|Something you are
4.5|4.6f|Just-in-time permissions
4.5|4.6g|OAuth
4.5|5.1g|Deprovisioning
4.5|access-review|An access review
4.5|backup-codes|A saved backup code
4.5|compromised-credentials|Compromised credential monitoring
4.5|emergency-access|Emergency access account
4.5|passkey|A passkey
4.5|passwordless|Passwordless authentication
4.5|time-based|Time-based
4.5|w7|Multifactor authentication
4.6|2.5g|Desired state management
4.6|4.7a|User provisioning
4.6|4.7b|Guardrails
4.6|4.7c|Ticket management
4.6|4.7d|Continuous integration
4.6|4.7g|Security Orchestration, Automation, and Response
4.6|agentic-ai|Agentic AI
4.6|ai-baseline|An AI-augmented baseline
4.6|ai-chatbot|Chatbot
4.6|anomaly-detection|Anomaly detection
4.6|predictive-analysis|Predictive analysis
4.7|2.5f|Isolation
4.7|3.4c|Tabletop exercise
4.7|4.8a|Eradication
4.7|4.8b|Containment
4.7|4.8c|Chain of custody
4.7|4.8e|Threat hunting
4.7|4.8f|Lessons learned
4.7|5.1b|Playbook
4.7|advisories|An external advisory
4.7|mandatory-notification|Regulators and affected customers
4.7|negotiation|Negotiation
4.7|post-incident-report|A post-incident report
4.7|root-cause-analysis|Root cause analysis
4.8|3.4f|Snapshot
4.8|4.8g|Memory (RAM)
4.8|4.9a|Packet capture
4.8|4.9b|Metadata
4.8|4.9c|Firewall log
4.8|4.9d|Security log
4.8|4.9e|Vulnerability scans
4.8|4.9f|Endpoint log
4.8|4.9g|Dashboard
4.8|bit-level-copy|Bit-level copy
4.8|hr-legal|HR and legal
4.8|ipfix|IPFIX
4.8|log-parsing|Log parsing
4.8|memory-dump|Memory dump
5.1|4.1a|BYOD policy
5.1|5.1a|Acceptable use policy
5.1|5.1c|Standard
5.1|bc-dr-plans|Business continuity plan
5.1|clean-desk|Clean desk policy
5.1|guidelines|Guidelines (benchmarks)
5.1|rfc|An IETF request for comments
5.1|runbook|Runbook
5.1|vulnerability-disclosure-policy|Vulnerability disclosure policy
5.2|4.3g|Accept
5.2|5.2a|SLE × ARO
5.2|5.2b|Transfer
5.2|5.2c|Avoid
5.2|5.2f|Qualitative
5.2|5.2g|Risk register
5.2|bia|Business impact analysis
5.2|management-oversight|Management oversight
5.2|residual-risk|Residual risk
5.2|risk-appetite|Risk appetite
5.3|5.3a|SLA
5.3|5.3b|Right-to-audit clause
5.3|5.3c|Memorandum of understanding
5.3|5.3d|NDA
5.3|5.3e|Statement of work
5.3|5.3f|Rules of engagement
5.3|5.3g|Due diligence
5.3|conflict-of-interest|A conflict of interest
5.3|eoi|Expression of interest (EOI)
5.3|rfi|Request for information (RFI)
5.3|slo|Service-level objective (SLO)
5.3|vendor-lock-in|Vendor lock-in
5.3|vendor-registry|Vendor registry
5.4|4.8d|Legal hold
5.4|5.1e|Processor
5.4|5.4a|Right to be forgotten
5.4|5.4b|Data subject
5.4|5.4c|An acknowledgement
5.4|5.4d|Loss of license
5.4|5.4e|HIPAA
5.4|aml-ctf|AML/CTF
5.4|anti-bribery|Anti-bribery
5.4|data-correction|Data correction
5.4|legal-orders|Comply, within the order's scope
5.4|opt-in|Opt-in consent
5.4|processing-restriction|Processing restriction
5.5|5.5a|Unknown environment
5.5|5.5b|Passive reconnaissance
5.5|5.5c|Active reconnaissance
5.5|5.5d|Physical
5.5|5.5e|Independent third-party audit
5.5|5.5f|Integrated testing
5.5|5.5g|Self-assessment
5.5|audit-charter|Audit charter
5.5|benchmarking|Benchmarking
5.5|diamond-model|Diamond Model
5.5|functional-testing|Functional testing
5.5|kill-chain|Cyber Kill Chain
5.5|mitre-attack|MITRE ATT&CK
5.5|sampling|Sampling
5.6|5.6a|Phishing campaign
5.6|5.6b|Report it to security
5.6|5.6c|Situational awareness
5.6|5.6d|Hybrid and remote work
5.6|5.6e|Operational security
5.6|5.6f|At hire, then on a recurring schedule
5.6|5.6g|Behavior risk scoring
5.6|bec-training|Business email compromise
5.6|corrective-training|Corrective training
5.6|lms|Learning management system (LMS)
5.6|one-to-many|One-to-many
`,
  };
}
