import type { ReferenceTable } from "../types";

export const authenticationTypes: ReferenceTable = {
  id: "authentication-types",
  title: "Authentication & AAA",
  description: "Authentication protocols, methods, and identity frameworks.",
  columnHeaders: [
    { key: "method", label: "Method / Protocol" },
    { key: "category", label: "Category" },
    { key: "description", label: "Description" },
    { key: "port", label: "Port", mono: true },
  ],
  entries: [
    { columns: { method: "RADIUS", category: "AAA protocol", description: "Centralised authentication — encrypts only password, combines authn/authz", port: "1812/1813" } },
    { columns: { method: "TACACS+", category: "AAA protocol", description: "Cisco — encrypts entire packet, separates authn/authz/accounting", port: "49" } },
    { columns: { method: "Kerberos", category: "SSO / Network auth", description: "Ticket-based mutual auth using KDC, TGT, and service tickets", port: "88" } },
    { columns: { method: "LDAP", category: "Directory service", description: "Query and modify directory (users, groups, OUs)", port: "389/636" } },
    { columns: { method: "SAML", category: "Federation / SSO", description: "XML-based SSO between IdP and SP — browser redirect flow", port: "443" } },
    { columns: { method: "OAuth 2.0", category: "Authorisation", description: "Delegated access tokens — authorisation not authentication", port: "443" } },
    { columns: { method: "OpenID Connect", category: "Federation / SSO", description: "Identity layer on OAuth 2.0 — adds ID token for authentication", port: "443" } },
    { columns: { method: "CHAP", category: "PPP auth", description: "Challenge-Handshake — three-way handshake, no plaintext password", port: "—" } },
    { columns: { method: "EAP", category: "802.1X framework", description: "Extensible framework supporting multiple auth methods (PEAP, EAP-TLS)", port: "—" } },
    { columns: { method: "EAP-TLS", category: "802.1X method", description: "Certificate-based mutual auth — most secure EAP method", port: "—" } },
    { columns: { method: "PEAP", category: "802.1X method", description: "Server cert + TLS tunnel, client uses password inside tunnel", port: "—" } },
    { columns: { method: "PAP", category: "PPP auth", description: "Password sent in plaintext — insecure, avoid", port: "—" } },
    { columns: { method: "MFA", category: "Auth concept", description: "Two or more factors: something you know / have / are / somewhere you are", port: "—" } },
    { columns: { method: "TOTP", category: "MFA method", description: "Time-based one-time password (e.g., authenticator app)", port: "—" } },
    { columns: { method: "HOTP", category: "MFA method", description: "HMAC-based one-time password — counter-based, not time-based", port: "—" } },
    { columns: { method: "FIDO2/WebAuthn", category: "Passwordless", description: "Public-key authentication via hardware token or biometric", port: "—" } },
    { columns: { method: "Certificate-based", category: "PKI auth", description: "X.509 certificates issued by CA — mutual TLS, smart cards", port: "—" } },
  ],
};
