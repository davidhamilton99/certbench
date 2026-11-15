import { choice, type AuthoredRep } from "../types";

/**
 * Security+ SY0-801: the opening stop. One taste of each domain, an AI rep
 * second because AI is what SY0-801 adds, and an exam-style closer.
 * First option is correct; see ../types.ts for the authoring rules, and
 * ./index.ts for what the keys mean.
 */
export const warmup: AuthoredRep[] = [
  choice("w1", "3.2", "recall", "SSH runs on port…", ["22", "23", "25", "3389"],
    "SSH is 22. It replaced Telnet on 23.", { mono: true }),
  choice("w-ai", "2.6", "quick",
    "Hidden text in an email tells the company's AI assistant to forward the whole inbox, and it obeys. What is this?",
    ["Prompt injection", "Poisoning", "Hallucination", "Model manipulation"],
    "Instructions hidden in content an AI reads can override what it was told. That's prompt injection."),
  choice("w3", "1.1", "quick", "A file hash proves a download wasn't changed. Which part of the CIA triad is that?",
    ["Integrity", "Confidentiality", "Availability", "Non-repudiation"],
    "Hashes prove data wasn't altered: integrity."),
  choice("w4", "1.1", "quick", "Each account gets only the permissions its job requires. Which principle is that?",
    ["Least privilege", "Separation of duties", "Defense in depth", "Zero Trust"],
    "Least privilege: only the access the job needs."),
  choice("w5", "2.5", "quick", "A text says your parcel is held and links to a fake courier site. What is this?",
    ["Smishing", "Vishing", "Whaling", "Typosquatting"],
    "Smishing is phishing over SMS."),
  choice("w6", "1.3", "recall", "AES is which kind of encryption?",
    ["Symmetric", "Asymmetric", "Hashing", "Key exchange"],
    "AES uses one shared key for both directions: symmetric."),
  choice("w7", "4.5", "quick", "Tapping a badge and then entering a PIN at the server room door is…",
    ["Multifactor authentication", "Single sign-on", "Defense in depth", "Separation of duties"],
    "Something you have plus something you know is two factors, so MFA."),
  choice("w8", "2.5", "exam",
    "Overnight, the SIEM shows one IP address trying the password Winter2024! exactly once against each of 800 different user accounts. Which attack is this most likely?",
    ["Password spraying", "Brute force", "Credential stuffing", "Dictionary attack"],
    "One common password tried across many accounts is spraying. Brute force hammers one account with many passwords."),
];
