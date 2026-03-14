-- ============================================================
-- CompTIA A+ 220-1102 (Core 2) — certification + domains
-- ============================================================
insert into public.certifications (slug, name, exam_code, vendor, total_exam_questions, passing_score, max_score, exam_duration_minutes)
values ('a-plus-core2-220-1102', 'CompTIA A+ Core 2', '220-1102', 'CompTIA', 90, 700, 900, 90);

with cert as (select id from certifications where slug = 'a-plus-core2-220-1102')
insert into public.cert_domains (certification_id, domain_number, title, exam_weight, sort_order)
values
  ((select id from cert), '1.0', 'Operating Systems', 31.00, 1),
  ((select id from cert), '2.0', 'Security', 25.00, 2),
  ((select id from cert), '3.0', 'Software Troubleshooting', 22.00, 3),
  ((select id from cert), '4.0', 'Operational Procedures', 22.00, 4);

-- ============================================================
-- A+ Core 1 (220-1101) Sub-Objectives
-- ============================================================

-- Domain 1.0 Mobile Devices (15%)
with domain as (
  select d.id from cert_domains d
  join certifications c on c.id = d.certification_id
  where c.slug = 'a-plus-core1-220-1101' and d.domain_number = '1.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from domain), '1.1', 'Given a scenario, install and configure laptop hardware and components', 1),
  ((select id from domain), '1.2', 'Compare and contrast the display components of mobile devices', 2),
  ((select id from domain), '1.3', 'Given a scenario, set up and configure accessories and ports of mobile devices', 3),
  ((select id from domain), '1.4', 'Given a scenario, configure basic mobile-device network connectivity and application support', 4);

-- Domain 2.0 Networking (20%)
with domain as (
  select d.id from cert_domains d
  join certifications c on c.id = d.certification_id
  where c.slug = 'a-plus-core1-220-1101' and d.domain_number = '2.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from domain), '2.1', 'Compare and contrast TCP and UDP ports, protocols, and their purposes', 1),
  ((select id from domain), '2.2', 'Compare and contrast common networking hardware', 2),
  ((select id from domain), '2.3', 'Compare and contrast protocols for wireless networking', 3),
  ((select id from domain), '2.4', 'Summarize services provided by networked hosts', 4),
  ((select id from domain), '2.5', 'Given a scenario, install and configure basic wired/wireless SOHO networks', 5),
  ((select id from domain), '2.6', 'Compare and contrast common network configuration concepts', 6),
  ((select id from domain), '2.7', 'Compare and contrast internet connection types, network types, and their features', 7),
  ((select id from domain), '2.8', 'Given a scenario, use networking tools', 8);

-- Domain 3.0 Hardware (25%)
with domain as (
  select d.id from cert_domains d
  join certifications c on c.id = d.certification_id
  where c.slug = 'a-plus-core1-220-1101' and d.domain_number = '3.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from domain), '3.1', 'Explain basic cable types and their connectors, features, and purposes', 1),
  ((select id from domain), '3.2', 'Given a scenario, install the appropriate RAM', 2),
  ((select id from domain), '3.3', 'Given a scenario, select and install storage devices', 3),
  ((select id from domain), '3.4', 'Given a scenario, install and configure motherboards, CPUs, and add-on cards', 4),
  ((select id from domain), '3.5', 'Given a scenario, install or replace the appropriate power supply', 5),
  ((select id from domain), '3.6', 'Given a scenario, deploy and configure multifunction devices/printers and settings', 6),
  ((select id from domain), '3.7', 'Summarize cloud-computing concepts', 7);

-- Domain 4.0 Virtualization and Cloud Computing (11%)
with domain as (
  select d.id from cert_domains d
  join certifications c on c.id = d.certification_id
  where c.slug = 'a-plus-core1-220-1101' and d.domain_number = '4.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from domain), '4.1', 'Summarize cloud-computing concepts', 1),
  ((select id from domain), '4.2', 'Summarize aspects of client-side virtualization', 2);

-- Domain 5.0 Hardware and Network Troubleshooting (29%)
with domain as (
  select d.id from cert_domains d
  join certifications c on c.id = d.certification_id
  where c.slug = 'a-plus-core1-220-1101' and d.domain_number = '5.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from domain), '5.1', 'Given a scenario, apply the best practice methodology to resolve problems', 1),
  ((select id from domain), '5.2', 'Given a scenario, troubleshoot problems related to motherboards, RAM, CPU, and power', 2),
  ((select id from domain), '5.3', 'Given a scenario, troubleshoot and diagnose problems with storage drives and RAID arrays', 3),
  ((select id from domain), '5.4', 'Given a scenario, troubleshoot video, projector, and display issues', 4),
  ((select id from domain), '5.5', 'Given a scenario, troubleshoot common issues with mobile devices', 5),
  ((select id from domain), '5.6', 'Given a scenario, troubleshoot and resolve printer issues', 6),
  ((select id from domain), '5.7', 'Given a scenario, troubleshoot problems with wired and wireless networks', 7);

-- ============================================================
-- A+ Core 2 (220-1102) Sub-Objectives
-- ============================================================

-- Domain 1.0 Operating Systems (31%)
with domain as (
  select d.id from cert_domains d
  join certifications c on c.id = d.certification_id
  where c.slug = 'a-plus-core2-220-1102' and d.domain_number = '1.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from domain), '1.1', 'Identify basic features of Microsoft Windows editions', 1),
  ((select id from domain), '1.2', 'Given a scenario, use the appropriate Microsoft command-line tool', 2),
  ((select id from domain), '1.3', 'Given a scenario, use features and tools of the Microsoft Windows 10 operating system', 3),
  ((select id from domain), '1.4', 'Given a scenario, use the appropriate Microsoft Windows 10 Control Panel utility', 4),
  ((select id from domain), '1.5', 'Given a scenario, use the appropriate Windows settings', 5),
  ((select id from domain), '1.6', 'Given a scenario, configure Microsoft Windows networking features on a client/desktop', 6),
  ((select id from domain), '1.7', 'Given a scenario, apply application installation and configuration concepts', 7),
  ((select id from domain), '1.8', 'Explain common OS types and their purposes', 8),
  ((select id from domain), '1.9', 'Given a scenario, perform OS installations and upgrades in a diverse OS environment', 9),
  ((select id from domain), '1.10', 'Identify common features and tools of the macOS/desktop OS', 10),
  ((select id from domain), '1.11', 'Identify common features and tools of the Linux client/desktop OS', 11);

-- Domain 2.0 Security (25%)
with domain as (
  select d.id from cert_domains d
  join certifications c on c.id = d.certification_id
  where c.slug = 'a-plus-core2-220-1102' and d.domain_number = '2.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from domain), '2.1', 'Summarize various security measures and their purposes', 1),
  ((select id from domain), '2.2', 'Compare and contrast wireless security protocols and authentication methods', 2),
  ((select id from domain), '2.3', 'Given a scenario, detect, remove, and prevent malware using the appropriate tools and methods', 3),
  ((select id from domain), '2.4', 'Explain common social engineering attacks, threats, and vulnerabilities', 4),
  ((select id from domain), '2.5', 'Given a scenario, manage and configure basic security settings in the Microsoft Windows OS', 5),
  ((select id from domain), '2.6', 'Given a scenario, configure a workstation to meet best practices for security', 6),
  ((select id from domain), '2.7', 'Explain common methods for securing mobile and embedded devices', 7),
  ((select id from domain), '2.8', 'Given a scenario, use common data destruction and disposal methods', 8),
  ((select id from domain), '2.9', 'Given a scenario, configure appropriate security settings on SOHO wireless and wired networks', 9),
  ((select id from domain), '2.10', 'Given a scenario, install and configure browsers and relevant security settings', 10);

-- Domain 3.0 Software Troubleshooting (22%)
with domain as (
  select d.id from cert_domains d
  join certifications c on c.id = d.certification_id
  where c.slug = 'a-plus-core2-220-1102' and d.domain_number = '3.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from domain), '3.1', 'Given a scenario, troubleshoot common Windows OS problems', 1),
  ((select id from domain), '3.2', 'Given a scenario, troubleshoot common personal computer (PC) security issues', 2),
  ((select id from domain), '3.3', 'Given a scenario, use best practice procedures for malware removal', 3),
  ((select id from domain), '3.4', 'Given a scenario, troubleshoot common mobile OS and application issues', 4),
  ((select id from domain), '3.5', 'Given a scenario, troubleshoot common mobile OS and application security issues', 5);

-- Domain 4.0 Operational Procedures (22%)
with domain as (
  select d.id from cert_domains d
  join certifications c on c.id = d.certification_id
  where c.slug = 'a-plus-core2-220-1102' and d.domain_number = '4.0'
)
insert into public.cert_sub_objectives (domain_id, code, title, sort_order)
values
  ((select id from domain), '4.1', 'Given a scenario, implement best practices associated with documentation and support systems management', 1),
  ((select id from domain), '4.2', 'Explain basic change-management best practices', 2),
  ((select id from domain), '4.3', 'Given a scenario, implement workstation backup and recovery methods', 3),
  ((select id from domain), '4.4', 'Given a scenario, use common safety procedures', 4),
  ((select id from domain), '4.5', 'Summarize environmental impacts and local environmental controls', 5),
  ((select id from domain), '4.6', 'Explain the importance of prohibited content/activity and privacy, licensing, and policy concepts', 6),
  ((select id from domain), '4.7', 'Given a scenario, use proper communication techniques and professionalism', 7),
  ((select id from domain), '4.8', 'Identify the basics of scripting', 8),
  ((select id from domain), '4.9', 'Given a scenario, use remote access technologies', 9);
