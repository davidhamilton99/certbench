-- ============================================================
-- CertBench — Seed Certifications, Domains & Sub-Objectives
-- Run AFTER 001_complete_schema.sql
-- ============================================================

-- ============================================================
-- CompTIA Security+ SY0-701
-- ============================================================
insert into public.certifications (slug, name, exam_code, vendor, total_exam_questions, passing_score, max_score, exam_duration_minutes)
values ('security-plus-sy0-701', 'CompTIA Security+', 'SY0-701', 'CompTIA', 90, 750, 900, 90);

-- Domains
with cert as (select id from certifications where slug = 'security-plus-sy0-701')
insert into public.cert_domains (certification_id, domain_number, title, exam_weight, sort_order)
values
  ((select id from cert), '1.0', 'General Security Concepts', 12.00, 1),
  ((select id from cert), '2.0', 'Threats, Vulnerabilities, and Mitigations', 22.00, 2),
  ((select id from cert), '3.0', 'Security Architecture', 18.00, 3),
  ((select id from cert), '4.0', 'Security Operations', 28.00, 4),
  ((select id from cert), '5.0', 'Security Program Management and Oversight', 20.00, 5);

-- Sub-objectives: Domain 1.0 General Security Concepts
with d as (
  select cd.id from cert_domains cd
  join certifications c on cd.certification_id = c.id
  where c.slug = 'security-plus-sy0-701' and cd.domain_number = '1.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from d), '1.1', 'Compare and contrast various types of security controls', 1),
  ((select id from d), '1.2', 'Summarize fundamental security concepts', 2),
  ((select id from d), '1.3', 'Explain the importance of change management processes and the impact to security', 3),
  ((select id from d), '1.4', 'Explain the importance of using appropriate cryptographic solutions', 4);

-- Sub-objectives: Domain 2.0 Threats, Vulnerabilities, and Mitigations
with d as (
  select cd.id from cert_domains cd
  join certifications c on cd.certification_id = c.id
  where c.slug = 'security-plus-sy0-701' and cd.domain_number = '2.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from d), '2.1', 'Compare and contrast common threat actors and motivations', 1),
  ((select id from d), '2.2', 'Explain common threat vectors and attack surfaces', 2),
  ((select id from d), '2.3', 'Explain various types of vulnerabilities', 3),
  ((select id from d), '2.4', 'Given a scenario, analyze indicators of malicious activity', 4),
  ((select id from d), '2.5', 'Explain the purpose of mitigation techniques used to secure the enterprise', 5);

-- Sub-objectives: Domain 3.0 Security Architecture
with d as (
  select cd.id from cert_domains cd
  join certifications c on cd.certification_id = c.id
  where c.slug = 'security-plus-sy0-701' and cd.domain_number = '3.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from d), '3.1', 'Compare and contrast security implications of different architecture models', 1),
  ((select id from d), '3.2', 'Given a scenario, apply security principles to secure enterprise infrastructure', 2),
  ((select id from d), '3.3', 'Compare and contrast concepts and strategies to protect data', 3),
  ((select id from d), '3.4', 'Explain the importance of resilience and recovery in security architecture', 4);

-- Sub-objectives: Domain 4.0 Security Operations
with d as (
  select cd.id from cert_domains cd
  join certifications c on cd.certification_id = c.id
  where c.slug = 'security-plus-sy0-701' and cd.domain_number = '4.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from d), '4.1', 'Given a scenario, apply common security techniques to computing resources', 1),
  ((select id from d), '4.2', 'Explain the security implications of proper hardware, software, and data asset management', 2),
  ((select id from d), '4.3', 'Explain various activities associated with vulnerability management', 3),
  ((select id from d), '4.4', 'Explain security alerting and monitoring concepts and tools', 4),
  ((select id from d), '4.5', 'Given a scenario, modify enterprise capabilities to enhance security', 5),
  ((select id from d), '4.6', 'Given a scenario, implement and maintain identity and access management', 6),
  ((select id from d), '4.7', 'Explain the importance of automation and orchestration related to secure operations', 7),
  ((select id from d), '4.8', 'Explain appropriate incident response activities', 8),
  ((select id from d), '4.9', 'Given a scenario, use data sources to support an investigation', 9);

-- Sub-objectives: Domain 5.0 Security Program Management and Oversight
with d as (
  select cd.id from cert_domains cd
  join certifications c on cd.certification_id = c.id
  where c.slug = 'security-plus-sy0-701' and cd.domain_number = '5.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from d), '5.1', 'Summarize elements of effective security governance', 1),
  ((select id from d), '5.2', 'Explain elements of the risk management process', 2),
  ((select id from d), '5.3', 'Explain the processes associated with third-party risk assessment and management', 3),
  ((select id from d), '5.4', 'Summarize elements of effective security compliance', 4),
  ((select id from d), '5.5', 'Explain types and purposes of audits and assessments', 5),
  ((select id from d), '5.6', 'Given a scenario, implement security awareness practices', 6);


-- ============================================================
-- CompTIA Network+ N10-009
-- ============================================================
insert into public.certifications (slug, name, exam_code, vendor, total_exam_questions, passing_score, max_score, exam_duration_minutes)
values ('network-plus-n10-009', 'CompTIA Network+', 'N10-009', 'CompTIA', 90, 720, 900, 90);

with cert as (select id from certifications where slug = 'network-plus-n10-009')
insert into public.cert_domains (certification_id, domain_number, title, exam_weight, sort_order)
values
  ((select id from cert), '1.0', 'Networking Concepts', 23.00, 1),
  ((select id from cert), '2.0', 'Network Implementation', 20.00, 2),
  ((select id from cert), '3.0', 'Network Operations', 20.00, 3),
  ((select id from cert), '4.0', 'Network Security', 19.00, 4),
  ((select id from cert), '5.0', 'Network Troubleshooting', 18.00, 5);


-- ============================================================
-- CompTIA A+ 220-1101 (Core 1)
-- ============================================================
insert into public.certifications (slug, name, exam_code, vendor, total_exam_questions, passing_score, max_score, exam_duration_minutes)
values ('a-plus-core1-220-1101', 'CompTIA A+ Core 1', '220-1101', 'CompTIA', 90, 675, 900, 90);

with cert as (select id from certifications where slug = 'a-plus-core1-220-1101')
insert into public.cert_domains (certification_id, domain_number, title, exam_weight, sort_order)
values
  ((select id from cert), '1.0', 'Mobile Devices', 15.00, 1),
  ((select id from cert), '2.0', 'Networking', 20.00, 2),
  ((select id from cert), '3.0', 'Hardware', 25.00, 3),
  ((select id from cert), '4.0', 'Virtualization and Cloud Computing', 11.00, 4),
  ((select id from cert), '5.0', 'Hardware and Network Troubleshooting', 29.00, 5);
