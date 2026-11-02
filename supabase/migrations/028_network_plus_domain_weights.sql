-- CompTIA's published N10-009 domain weights are 23 / 20 / 19 / 14 / 24
-- (comptia.org/en-us/certifications/network, checked 2026-11-02). The seed in
-- 002_seed_certifications.sql had 23 / 20 / 20 / 19 / 18, so readiness scores
-- and the "weighted like the real exam" checks were using the wrong mix.
update public.cert_domains d
set exam_weight = v.weight
from public.certifications c,
  (values ('3.0', 19.00), ('4.0', 14.00), ('5.0', 24.00)) as v(domain_number, weight)
where d.certification_id = c.id
  and c.slug = 'network-plus-n10-009'
  and d.domain_number = v.domain_number;
