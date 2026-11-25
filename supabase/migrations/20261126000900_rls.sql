-- Étape 1 — Politiques de sécurité au niveau des lignes (docs/04 §4.1, NFR-SUP-SEC-01)
-- Double verrou : user_id = auth.uid() ET habilitation active au mandant de la ligne.
-- Aucune politique pour anon : accès refusé par défaut.

alter table public.mandants enable row level security;
alter table public.habilitations enable row level security;
alter table public.utilisateurs_autorises enable row level security; -- aucune politique : inaccessible
alter table public.types_prise_alimentaire enable row level security;
alter table public.aliments enable row level security;
alter table public.recettes enable row level security;
alter table public.compositions_recette enable row level security;
alter table public.plats_prepares enable row level security;
alter table public.prises_alimentaires enable row level security;
alter table public.elements_prise_alimentaire enable row level security;
alter table public.cibles_nutritionnelles enable row level security;
alter table public.poids_reference enable row level security;

-- Ceinture et bretelles : utilisateurs_autorises n'est accessible à aucun rôle de l'API.
revoke all on table public.utilisateurs_autorises from anon, authenticated;

create policy habilitations_lecture on public.habilitations
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy mandants_lecture on public.mandants
  for select to authenticated
  using (
    est_actif
    and exists (select 1 from public.habilitations h
                 where h.mandant_id = mandants.id
                   and h.user_id = (select auth.uid())
                   and h.est_active)
  );

do $$
declare
  t text;
begin
  foreach t in array array[
    'types_prise_alimentaire', 'aliments', 'recettes', 'compositions_recette', 'plats_prepares',
    'prises_alimentaires', 'elements_prise_alimentaire', 'cibles_nutritionnelles', 'poids_reference'
  ]
  loop
    execute format(
      'create policy %1$s_lecture on public.%1$I for select to authenticated
         using (user_id = (select auth.uid()) and public.est_habilite_mandant(mandant_id))', t);
    execute format(
      'create policy %1$s_creation on public.%1$I for insert to authenticated
         with check (user_id = (select auth.uid()) and public.est_habilite_mandant(mandant_id))', t);
    execute format(
      'create policy %1$s_modification on public.%1$I for update to authenticated
         using (user_id = (select auth.uid()) and public.est_habilite_mandant(mandant_id))
         with check (user_id = (select auth.uid()) and public.est_habilite_mandant(mandant_id))', t);
    execute format(
      'create policy %1$s_suppression on public.%1$I for delete to authenticated
         using (user_id = (select auth.uid()) and public.est_habilite_mandant(mandant_id))', t);
  end loop;
end;
$$;
