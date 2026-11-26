-- Tests pgTAP (docs/04 §6.1), exécutés par `supabase test db` sur une instance jetable
-- (GitHub Actions). Jamais sur le projet réel. Ciblent exclusivement le mandant TEST.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- Échec explicite si TEST est absent (pas de repli sur REAL).
select isnt((select id from public.mandants where code = 'TEST' and est_actif), null, 'le mandant TEST existe et est actif');

-- RLS activée partout.
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0, 'RLS activée sur toutes les tables de public');

-- Données de test.
insert into public.utilisateurs_autorises (email, mandant_id)
select 'alice@exemple.fr', id from public.mandants where code = 'TEST';
insert into public.utilisateurs_autorises (email, mandant_id)
select 'bob@exemple.fr', id from public.mandants where code = 'TEST';
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'Alice@Exemple.fr'),
  ('22222222-2222-2222-2222-222222222222', 'bob@exemple.fr'),
  ('33333333-3333-3333-3333-333333333333', 'intrus@exemple.fr');

-- Première connexion.
select is((select count(*)::int from public.habilitations where user_id = '11111111-1111-1111-1111-111111111111'), 1, 'habilitation créée (e-mail comparé en minuscules)');
select is((select count(*)::int from public.types_prise_alimentaire where user_id = '11111111-1111-1111-1111-111111111111'), 7, '7 types initiaux');
select is((select count(*)::int from public.types_prise_alimentaire where user_id = '11111111-1111-1111-1111-111111111111' and est_type_par_defaut), 1, 'un seul type par défaut');
select is((select count(*)::int from public.cibles_nutritionnelles where user_id = '11111111-1111-1111-1111-111111111111'), 7, '7 cibles de départ');
select is((select count(*)::int from public.habilitations where user_id = '33333333-3333-3333-3333-333333333333'), 0, 'compte non autorisé : aucune habilitation');

-- anon.
set local role anon;
select throws_ok($$ select * from public.mandants $$, '42501', null, 'anon : mandants inaccessibles');
select throws_ok($$ select * from public.utilisateurs_autorises $$, '42501', null, 'anon : utilisateurs_autorises inaccessible');
reset role;

-- Alice.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select is((select count(*)::int from public.mandants), 1, 'Alice ne voit que TEST');
select throws_ok($$ select * from public.utilisateurs_autorises $$, '42501', null, 'utilisateurs_autorises inaccessible');
select throws_ok(
  $$ insert into public.aliments (mandant_id, nom) select id, 'Pomme' from public.mandants where code = 'REAL' $$,
  '42501', null, 'écriture refusée dans un mandant non habilité (REAL)');
select lives_ok(
  $$ insert into public.aliments (mandant_id, nom, est_cuisinable) select id, 'Riz', true from public.mandants where code = 'TEST' $$,
  'Alice crée un aliment dans TEST');
select is((select statut_evaluation from public.aliments where nom = 'Riz'), 'NON_EVALUE', 'aliment créé avec son seul nom : non évalué');
select throws_ok(
  $$ insert into public.aliments (mandant_id, nom, est_cuisinable, rendement_cuisson) select id, 'Moutarde', false, 1.2 from public.mandants where code = 'TEST' $$,
  '23514', null, 'rendement interdit sur un aliment à état unique');
select lives_ok($$
  insert into public.prises_alimentaires (id, mandant_id, type_prise_alimentaire_id, horodatage_prise, date_locale)
  select 'aaaaaaaa-0000-0000-0000-000000000001', t.mandant_id, t.id, now(), current_date
    from public.types_prise_alimentaire t where t.priorite = 1 $$, 'prise alimentaire créée');
select throws_ok($$
  insert into public.elements_prise_alimentaire (prise_alimentaire_id, mandant_id, type_element, aliment_id, mode_portion, portion_grammes)
  select 'aaaaaaaa-0000-0000-0000-000000000001', a.mandant_id, 'ALIMENT', a.id, 'GRAMMES', 150 from public.aliments a where a.nom = 'Riz' $$,
  'P0001', null, 'état à la pesée obligatoire pour un aliment cuisinable');
select lives_ok($$
  insert into public.elements_prise_alimentaire (prise_alimentaire_id, mandant_id, type_element, aliment_id, etat_aliment, mode_portion, portion_grammes)
  select 'aaaaaaaa-0000-0000-0000-000000000001', a.mandant_id, 'ALIMENT', a.id, 'CUIT', 'GRAMMES', 150 from public.aliments a where a.nom = 'Riz' $$,
  'ligne Riz cuit 150 g');
select throws_ok($$ update public.aliments set est_cuisinable = false where nom = 'Riz' $$, 'P0001', null, 'cuisinable non modifiable sur un aliment utilisé');
select lives_ok($$ update public.aliments set rendement_cuisson = 2.5 where nom = 'Riz' $$, 'rendement modifiable');
select lives_ok($$ delete from public.aliments where nom = 'Riz' $$, 'suppression physique de l''aliment utilisé');
select is(
  (select libelle_element_supprime from public.elements_prise_alimentaire where prise_alimentaire_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Élément supprimé', 'la ligne historique affiche Élément supprimé');
reset role;

-- Bob ne voit rien d'Alice.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is((select count(*)::int from public.prises_alimentaires), 0, 'Bob ne voit pas les prises d''Alice');
select is((select count(*)::int from public.types_prise_alimentaire), 7, 'Bob ne voit que ses propres types');
reset role;

select * from finish();
rollback;
