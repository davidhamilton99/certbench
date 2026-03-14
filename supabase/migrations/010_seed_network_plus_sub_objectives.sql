-- ============================================================
-- Network+ N10-009 Sub-Objectives
-- ============================================================

-- Domain 1.0 Networking Concepts (23%)
with domain as (
  select d.id from cert_domains d
  join certifications c on c.id = d.certification_id
  where c.slug = 'network-plus-n10-009' and d.domain_number = '1.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from domain), '1.1', 'Explain concepts related to the Open Systems Interconnection (OSI) reference model', 1),
  ((select id from domain), '1.2', 'Compare and contrast networking appliances, applications, and functions', 2),
  ((select id from domain), '1.3', 'Summarize the types and characteristics of connectors and cabling', 3),
  ((select id from domain), '1.4', 'Given a scenario, configure a subnet and use appropriate IP addressing schemes', 4),
  ((select id from domain), '1.5', 'Compare and contrast common port numbers, protocols, services, and traffic types', 5),
  ((select id from domain), '1.6', 'Given a scenario, use the appropriate network tool or command', 6),
  ((select id from domain), '1.7', 'Explain basic corporate and datacenter network architecture', 7),
  ((select id from domain), '1.8', 'Summarize cloud concepts and connectivity options', 8);

-- Domain 2.0 Network Implementation (20%)
with domain as (
  select d.id from cert_domains d
  join certifications c on c.id = d.certification_id
  where c.slug = 'network-plus-n10-009' and d.domain_number = '2.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from domain), '2.1', 'Compare and contrast various network topologies, architectures, and types', 1),
  ((select id from domain), '2.2', 'Compare and contrast routing technologies and bandwidth management concepts', 2),
  ((select id from domain), '2.3', 'Given a scenario, configure and deploy common Ethernet switching features', 3),
  ((select id from domain), '2.4', 'Given a scenario, install and configure the appropriate wireless standards and technologies', 4);

-- Domain 3.0 Network Operations (20%)
with domain as (
  select d.id from cert_domains d
  join certifications c on c.id = d.certification_id
  where c.slug = 'network-plus-n10-009' and d.domain_number = '3.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from domain), '3.1', 'Given a scenario, use statistics and sensors to ensure network availability', 1),
  ((select id from domain), '3.2', 'Compare and contrast organizational documentation and policies', 2),
  ((select id from domain), '3.3', 'Given a scenario, manage network services', 3),
  ((select id from domain), '3.4', 'Explain common high availability and disaster recovery concepts', 4),
  ((select id from domain), '3.5', 'Given a scenario, use the appropriate network discovery, monitoring, or management tool', 5);

-- Domain 4.0 Network Security (19%)
with domain as (
  select d.id from cert_domains d
  join certifications c on c.id = d.certification_id
  where c.slug = 'network-plus-n10-009' and d.domain_number = '4.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from domain), '4.1', 'Explain common security concepts', 1),
  ((select id from domain), '4.2', 'Compare and contrast common types of attacks', 2),
  ((select id from domain), '4.3', 'Given a scenario, apply network hardening techniques', 3),
  ((select id from domain), '4.4', 'Compare and contrast remote access methods and security implications', 4),
  ((select id from domain), '4.5', 'Explain the importance of physical security', 5);

-- Domain 5.0 Network Troubleshooting (18%)
with domain as (
  select d.id from cert_domains d
  join certifications c on c.id = d.certification_id
  where c.slug = 'network-plus-n10-009' and d.domain_number = '5.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from domain), '5.1', 'Explain the network troubleshooting methodology', 1),
  ((select id from domain), '5.2', 'Given a scenario, troubleshoot common cable connectivity issues and select the appropriate tools', 2),
  ((select id from domain), '5.3', 'Given a scenario, troubleshoot common wireless connectivity issues', 3),
  ((select id from domain), '5.4', 'Given a scenario, troubleshoot general networking issues', 4),
  ((select id from domain), '5.5', 'Given a scenario, troubleshoot common network service issues', 5);
