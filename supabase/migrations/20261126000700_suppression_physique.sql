-- Étape 1 — Suppression physique d'un élément référencé : « Élément supprimé » (docs/04 §3.6, RG-SUP-02)
-- Avant la suppression, les lignes qui le référencent sont marquées ; la clé étrangère
-- ON DELETE SET NULL remet ensuite l'identifiant à NULL.

create or replace function public.marquer_element_supprime()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'aliments' then
    update public.elements_prise_alimentaire
       set est_element_supprime = true, libelle_element_supprime = 'Élément supprimé'
     where aliment_id = old.id;
    update public.compositions_recette
       set est_element_supprime = true, libelle_element_supprime = 'Élément supprimé'
     where aliment_id = old.id;
  elsif tg_table_name = 'recettes' then
    update public.elements_prise_alimentaire
       set est_element_supprime = true, libelle_element_supprime = 'Élément supprimé'
     where recette_id = old.id;
  elsif tg_table_name = 'plats_prepares' then
    update public.elements_prise_alimentaire
       set est_element_supprime = true, libelle_element_supprime = 'Élément supprimé'
     where plat_prepare_id = old.id;
  end if;
  return old;
end;
$$;

create trigger aliments_marquer_supprime before delete on public.aliments
  for each row execute function public.marquer_element_supprime();
create trigger recettes_marquer_supprime before delete on public.recettes
  for each row execute function public.marquer_element_supprime();
create trigger plats_prepares_marquer_supprime before delete on public.plats_prepares
  for each row execute function public.marquer_element_supprime();
