import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: cert } = await sb
    .from("certifications")
    .select("id")
    .eq("slug", "network-plus-n10-009")
    .single();

  if (!cert) {
    console.log("No cert found");
    return;
  }

  const { data: domains } = await sb
    .from("cert_domains")
    .select("id, domain_number, title")
    .eq("certification_id", cert.id);

  console.log("Domains:", domains?.length);

  if (!domains) return;

  const domainIds = domains.map((d) => d.id);
  const { data: subs } = await sb
    .from("cert_sub_objectives")
    .select("code, title")
    .in("domain_id", domainIds)
    .order("code");

  console.log("Sub-objectives:", subs?.length || 0);

  if (!subs || subs.length === 0) {
    console.log("No sub-objectives found. Inserting...");

    const domainMap: Record<string, string> = {};
    domains.forEach((d) => (domainMap[d.domain_number] = d.id));

    const subObjectives = [
      { domain: "1.0", code: "1.1", title: "Explain concepts related to the Open Systems Interconnection (OSI) reference model", sort: 1 },
      { domain: "1.0", code: "1.2", title: "Compare and contrast networking appliances, applications, and functions", sort: 2 },
      { domain: "1.0", code: "1.3", title: "Summarize the types and characteristics of connectors and cabling", sort: 3 },
      { domain: "1.0", code: "1.4", title: "Given a scenario, configure a subnet and use appropriate IP addressing schemes", sort: 4 },
      { domain: "1.0", code: "1.5", title: "Compare and contrast common port numbers, protocols, services, and traffic types", sort: 5 },
      { domain: "1.0", code: "1.6", title: "Given a scenario, use the appropriate network tool or command", sort: 6 },
      { domain: "1.0", code: "1.7", title: "Explain basic corporate and datacenter network architecture", sort: 7 },
      { domain: "1.0", code: "1.8", title: "Summarize cloud concepts and connectivity options", sort: 8 },
      { domain: "2.0", code: "2.1", title: "Compare and contrast various network topologies, architectures, and types", sort: 1 },
      { domain: "2.0", code: "2.2", title: "Compare and contrast routing technologies and bandwidth management concepts", sort: 2 },
      { domain: "2.0", code: "2.3", title: "Given a scenario, configure and deploy common Ethernet switching features", sort: 3 },
      { domain: "2.0", code: "2.4", title: "Given a scenario, install and configure the appropriate wireless standards and technologies", sort: 4 },
      { domain: "3.0", code: "3.1", title: "Given a scenario, use statistics and sensors to ensure network availability", sort: 1 },
      { domain: "3.0", code: "3.2", title: "Compare and contrast organizational documentation and policies", sort: 2 },
      { domain: "3.0", code: "3.3", title: "Given a scenario, manage network services", sort: 3 },
      { domain: "3.0", code: "3.4", title: "Explain common high availability and disaster recovery concepts", sort: 4 },
      { domain: "3.0", code: "3.5", title: "Given a scenario, use the appropriate network discovery, monitoring, or management tool", sort: 5 },
      { domain: "4.0", code: "4.1", title: "Explain common security concepts", sort: 1 },
      { domain: "4.0", code: "4.2", title: "Compare and contrast common types of attacks", sort: 2 },
      { domain: "4.0", code: "4.3", title: "Given a scenario, apply network hardening techniques", sort: 3 },
      { domain: "4.0", code: "4.4", title: "Compare and contrast remote access methods and security implications", sort: 4 },
      { domain: "4.0", code: "4.5", title: "Explain the importance of physical security", sort: 5 },
      { domain: "5.0", code: "5.1", title: "Explain the network troubleshooting methodology", sort: 1 },
      { domain: "5.0", code: "5.2", title: "Given a scenario, troubleshoot common cable connectivity issues and select the appropriate tools", sort: 2 },
      { domain: "5.0", code: "5.3", title: "Given a scenario, troubleshoot common wireless connectivity issues", sort: 3 },
      { domain: "5.0", code: "5.4", title: "Given a scenario, troubleshoot general networking issues", sort: 4 },
      { domain: "5.0", code: "5.5", title: "Given a scenario, troubleshoot common network service issues", sort: 5 },
    ];

    for (const sub of subObjectives) {
      const domainId = domainMap[sub.domain];
      if (!domainId) {
        console.error("No domain for " + sub.domain);
        continue;
      }
      const { error } = await sb.from("cert_sub_objectives").insert({
        domain_id: domainId,
        code: sub.code,
        title: sub.title,
        sort_order: sub.sort,
      });
      if (error) console.error("  Error " + sub.code + ": " + error.message);
      else console.log("  Inserted " + sub.code);
    }
  } else {
    subs.forEach((s) => console.log("  " + s.code + " " + s.title.substring(0, 60)));
  }
}

main().catch(console.error);
