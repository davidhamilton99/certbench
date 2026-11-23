import type { RecallDeckConfig } from "@/lib/recall/recall-deck";
import { securityPlusPortsDeck } from "./security-plus-ports";

/**
 * Curated Recall decks for Security+ SY0-701: hand-tuned column pairs, modes,
 * and bidirectionality for the highest-value memorization tables. Any reference
 * table without a curated config here is still drillable via the engine's
 * auto-deck heuristic; these just get the sharper treatment.
 *
 * Every deck explains its answers in sentences (`explain`). A test
 * (explanations.test.ts) holds every row to complete sentences of 22 words at
 * most that name the answer as the table has it.
 */
export const securityPlusRecallConfigs: RecallDeckConfig[] = [
  {
    id: "sec-acronyms",
    label: "Acronyms",
    blurb: "Expand every SY0-701 acronym, both directions.",
    tableId: "acronyms",
    mode: "choice",
    ask: { key: "acronym", label: "acronym" },
    answer: { key: "expansion", label: "expansion" },
    bidirectional: true,
    distractorGroupKey: "category",
    detailKeys: ["category"],
    // One sentence serves every row, whichever way round it is asked. The
    // public acronym quiz prints it after every answer.
    explain: { template: "{acronym} stands for {expansion}." },
  },
  // The ports deck is written in security-plus-ports.ts: the public port quiz
  // loads it in the browser, without the sentences of the decks below.
  securityPlusPortsDeck,
  {
    id: "sec-crypto",
    label: "Encryption and hashing",
    blurb: "Classify each algorithm: symmetric, asymmetric, hash…",
    tableId: "encryption-algorithms",
    mode: "choice",
    ask: { key: "algorithm", label: "algorithm" },
    answer: { key: "type", label: "type" },
    detailKeys: ["keySize", "use"],
    // Every row has sentences of its own, written from its cells: the type and
    // the key size first, then the status and the common use. The template
    // serves a row added later until its sentences are written. 3DES and
    // bcrypt are introduced by "The", because a sentence opens with a capital.
    explain: {
      template: "The type of {algorithm} is {type:lowerFirst}.",
      rows: {
        AES: "AES is a symmetric block cipher with 128, 192 or 256-bit keys. It is the current standard for data and disk encryption.",
        "3DES":
          "The 3DES algorithm is a deprecated symmetric block cipher with a 168-bit effective key. It remains in legacy systems and payment processing.",
        DES: "DES is a symmetric block cipher with a 56-bit key. It is insecure and should not be used.",
        Blowfish:
          "Blowfish is a legacy symmetric block cipher with keys of 32 to 448 bits. It is used in bcrypt password hashing.",
        Twofish:
          "Twofish is a symmetric block cipher with 128, 192 or 256-bit keys. It is a secure AES finalist used for disk encryption.",
        ChaCha20:
          "ChaCha20 is a current symmetric stream cipher with a 256-bit key. It is used in TLS 1.3, mobile devices and WireGuard.",
        RC4: "RC4 is a symmetric stream cipher with keys of 40 to 2048 bits. It is insecure and has been removed from TLS.",
        RSA: "RSA is an asymmetric algorithm with 2048 or 4096-bit keys. It is used for key exchange, digital signatures and TLS.",
        ECC: "ECC is a current asymmetric algorithm with 256 or 384-bit keys. Its shorter keys suit TLS, mobile devices and IoT.",
        "Diffie-Hellman":
          "Diffie-Hellman is a current key exchange algorithm with keys of 2048 bits or more. It provides key agreement, not encryption itself.",
        ECDHE:
          "ECDHE is a key exchange algorithm with a 256-bit key. It is the preferred choice for perfect forward secrecy in TLS.",
        DSA: "DSA is a legacy asymmetric signing algorithm with keys of 1024 to 3072 bits. It is used for digital signatures.",
        MD5: "MD5 is a hash algorithm with a 128-bit digest. It is insecure and is suitable for file verification only, not for security.",
        "SHA-1":
          "SHA-1 is a deprecated hash algorithm with a 160-bit digest. It remains in legacy certificate validation.",
        "SHA-256":
          "SHA-256 is a hash algorithm with a 256-bit digest. It is the current standard for digital signatures, certificates and integrity.",
        "SHA-3":
          "SHA-3 is a current hash algorithm with digests of 224 to 512 bits. It is an alternative to the SHA-2 family.",
        HMAC: "HMAC is a current MAC algorithm whose key size varies with the hash it uses. It provides message authentication and API signing.",
        bcrypt:
          "The bcrypt algorithm is a KDF and password hash with a 184-bit key size. Its adaptive cost suits password storage.",
        PBKDF2:
          "PBKDF2 is a current KDF and password hash with a configurable key size. It performs password-based key derivation.",
        Argon2:
          "Argon2 is a recommended KDF and password hash with a configurable key size. It is memory-hard and is used for password hashing.",
      },
    },
  },
  {
    id: "sec-attacks",
    label: "Attacks",
    blurb: "Name the attack from what it does.",
    tableId: "attack-types",
    mode: "choice",
    ask: { key: "description", label: "description" },
    answer: { key: "attack", label: "attack" },
    distractorGroupKey: "category",
    detailKeys: ["category", "mitigation"],
    // The description is the question, so the sentences do not repeat it. They
    // name the attack, give its category and list its key mitigations, as the
    // table has them. A row is named by its attack. The template serves a row
    // added later until its sentences are written.
    explain: {
      template: "{attack} is an attack in the {category:lowerFirst} category.",
      by: "attack",
      rows: {
        Phishing:
          "Phishing is a social engineering attack. Key mitigations are user training, email filtering and MFA.",
        "Spear phishing":
          "Spear phishing is a social engineering attack. Key mitigations are security awareness, DMARC and link analysis.",
        Whaling:
          "Whaling is a social engineering attack. Key mitigations are executive training and out-of-band verification.",
        Vishing:
          "Vishing is a social engineering attack. Key mitigations are callback verification and staff training.",
        Smishing: "Smishing is a social engineering attack. Key mitigations are user awareness and link filtering.",
        Pretexting:
          "Pretexting is a social engineering attack. Key mitigations are verification procedures and least privilege.",
        Tailgating: "Tailgating is a physical attack. Key mitigations are mantraps, security guards and awareness.",
        "Shoulder surfing":
          "Shoulder surfing is a physical attack. Key mitigations are privacy screens and awareness.",
        "SQL injection":
          "SQL injection is an injection attack. Key mitigations are parameterized queries, input validation and a WAF.",
        XSS: "XSS is an injection attack. Key mitigations are output encoding, CSP headers and input sanitization.",
        CSRF: "CSRF is a web attack. Key mitigations are anti-CSRF tokens and SameSite cookies.",
        "LDAP injection":
          "LDAP injection is an injection attack. Key mitigations are input validation and parameterized queries.",
        "Buffer overflow":
          "A buffer overflow is a memory attack. Key mitigations are ASLR, DEP, bounds checking and safe languages.",
        DDoS: "A DDoS attack is an attack on availability. Key mitigations are a CDN, rate limiting and scrubbing services.",
        "DNS poisoning": "DNS poisoning is a network attack. Key mitigations are DNSSEC and DNS-over-HTTPS.",
        "ARP spoofing":
          "ARP spoofing is a network attack. Key mitigations are dynamic ARP inspection and static ARP entries.",
        "Man-in-the-middle":
          "A man-in-the-middle attack is a network attack. Key mitigations are TLS, certificate pinning and mutual authentication.",
        "Replay attack":
          "A replay attack is a network attack. Key mitigations are timestamps, nonces and session tokens.",
        "Pass-the-hash":
          "A pass-the-hash attack is a credential attack. Key mitigations are Credential Guard, restricting NTLM and MFA.",
        "Brute force":
          "A brute force attack is a credential attack. Key mitigations are account lockout, rate limiting, MFA and bcrypt.",
        "Dictionary attack":
          "A dictionary attack is a credential attack. Key mitigations are a complex password policy, MFA and salted hashes.",
        "Rainbow table":
          "A rainbow table attack is a credential attack. The key mitigation is to use salted hashes, such as bcrypt and Argon2.",
        "Privilege escalation":
          "Privilege escalation is a post-exploit attack. Key mitigations are least privilege, patching and UAC.",
        Ransomware:
          "Ransomware is a type of malware. Key mitigations are backups, endpoint protection and network segmentation.",
        Trojan:
          "A Trojan is a type of malware. Key mitigations are application whitelisting and endpoint protection.",
        Rootkit:
          "A rootkit is a type of malware. Key mitigations are secure boot, integrity monitoring and reimaging.",
        "Zero-day":
          "A zero-day attack exploits an unknown or unpatched vulnerability. Key mitigations are defense in depth, behavior analysis and IDS/IPS.",
        "Supply chain attack":
          "A supply chain attack comes through a third party. Key mitigations are vendor vetting, code signing and SBOMs.",
        "On-path attack":
          "An on-path attack is a network attack. Key mitigations are encryption with TLS and certificate validation.",
        "Credential stuffing":
          "Credential stuffing is a credential attack. Key mitigations are MFA, breach monitoring and rate limiting.",
      },
    },
  },
  {
    id: "sec-auth",
    label: "Authentication",
    blurb: "Identify the auth method from its description.",
    tableId: "authentication-types",
    mode: "choice",
    ask: { key: "description", label: "description" },
    answer: { key: "method", label: "method" },
    distractorGroupKey: "category",
    detailKeys: ["category", "port"],
    // The first sentence names the method and its category, with its port
    // where the table gives one. The second says, in a sentence, what the
    // table's description says in a note. A row is named by its method. The
    // template serves a row added later until its sentences are written.
    explain: {
      template: "{method} is in the {category:lowerFirst} category.",
      by: "method",
      rows: {
        RADIUS:
          "RADIUS is an AAA protocol that uses ports 1812 and 1813. It encrypts only the password and combines authentication and authorization.",
        "TACACS+":
          "TACACS+ is an AAA protocol that uses port 49. It encrypts the entire packet and separates authentication, authorization and accounting.",
        Kerberos:
          "Kerberos is an SSO and network authentication protocol that uses port 88. It uses tickets from a KDC for mutual authentication.",
        LDAP: "LDAP is a directory service protocol on ports 389 and 636. It queries and modifies a directory of users, groups and OUs.",
        SAML: "SAML provides federation and SSO on port 443. It is XML-based and works between an IdP and an SP through browser redirects.",
        "OAuth 2.0":
          "OAuth 2.0 provides authorization, not authentication, on port 443. It issues delegated access tokens.",
        "OpenID Connect":
          "OpenID Connect provides federation and SSO on port 443. It is an identity layer on OAuth 2.0 that adds an ID token.",
        CHAP: "CHAP is a PPP authentication method. It uses a three-way handshake and sends no plaintext password.",
        EAP: "EAP is an 802.1X authentication framework. It supports multiple authentication methods, such as PEAP and EAP-TLS.",
        "EAP-TLS":
          "EAP-TLS is an 802.1X authentication method. It uses certificates for mutual authentication and is the most secure EAP method.",
        PEAP: "PEAP is an 802.1X authentication method. The server presents a certificate, and the client sends its password inside a TLS tunnel.",
        PAP: "PAP is a PPP authentication method. It sends the password in plaintext, so it is insecure.",
        MFA: "MFA is an authentication concept. It requires two or more factors, such as something you know and something you have.",
        TOTP: "TOTP is an MFA method. It is a time-based one-time password, as used by an authenticator app.",
        HOTP: "HOTP is an MFA method. It is an HMAC-based one-time password that is counter-based, not time-based.",
        "FIDO2/WebAuthn":
          "FIDO2/WebAuthn is a passwordless authentication method. It uses public-key authentication with a hardware token or a biometric.",
        "Certificate-based":
          "Certificate-based authentication is a PKI authentication method. It uses X.509 certificates issued by a CA, as in mutual TLS and smart cards.",
      },
    },
  },
  {
    id: "sec-osi",
    label: "OSI model",
    blurb: "Match each layer to its number, both ways.",
    tableId: "osi-model",
    mode: "choice",
    ask: { key: "name", label: "layer" },
    answer: { key: "layer", label: "layer number" },
    bidirectional: true,
    detailKeys: ["function", "attacks"],
    explain: { template: "The {name} layer is layer {layer} of the OSI model." },
  },
];
