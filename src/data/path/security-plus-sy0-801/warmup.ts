import { choice, type AuthoredRep } from "../types";

/**
 * Security+ SY0-801: the opening stop. One taste of each domain, an AI rep
 * second because AI is what SY0-801 adds, and an exam-style closer.
 * First option is correct; see ../types.ts for the authoring rules, and
 * ./index.ts for what the keys mean.
 */
export const warmup: AuthoredRep[] = [
  choice("w1", "3.2", "recall", "Which port does SSH use?", ["22", "23", "25", "3389"],
    "SSH uses port 22. It replaced Telnet, which uses port 23.", { mono: true }),
  choice("w-ai", "2.6", "quick",
    "Hidden text in an email tells the company's AI assistant to forward the whole inbox, and it obeys. What is this?",
    ["Prompt injection", "Poisoning", "Hallucination", "Model manipulation"],
    "Instructions hidden in content that an AI system reads can override the instructions it was given. This is prompt injection."),
  choice("w3", "1.1", "quick", "A file hash proves a download was not changed. Which part of the CIA triad is that?",
    ["Integrity", "Confidentiality", "Availability", "Non-repudiation"],
    "Integrity means that data has not been altered. A hash shows whether it has."),
  choice("w4", "1.1", "quick", "Each account gets only the permissions its job requires. Which principle is that?",
    ["Least privilege", "Separation of duties", "Defense in depth", "Zero Trust"],
    "Least privilege gives an account only the access that its job needs."),
  choice("w5", "2.5", "quick", "A text says your parcel is held and links to a fake courier site. What is this?",
    ["Smishing", "Vishing", "Whaling", "Typosquatting"],
    "Smishing is phishing by text message (SMS). Vishing is phishing by voice call."),
  choice("w6", "1.3", "recall", "AES is which kind of encryption?",
    ["Symmetric", "Asymmetric", "Hashing", "Key exchange"],
    "AES uses one shared key to encrypt and to decrypt, which makes it symmetric."),
  choice("w7", "4.5", "quick", "A technician taps a badge and then enters a PIN at the server room door. What is this an example of?",
    ["Multifactor authentication", "Single sign-on", "Defense in depth", "Separation of duties"],
    "The badge is something you have, and the PIN is something you know. Two different factors make this multifactor authentication."),
  choice("w8", "2.5", "exam",
    "Overnight, the SIEM shows one IP address trying the password Winter2024! exactly once against each of 800 different user accounts. Which attack is this most likely?",
    ["Password spraying", "Brute force", "Credential stuffing", "Dictionary attack"],
    "Password spraying tries one common password against many accounts. A brute force attack tries many passwords against one account."),
];
