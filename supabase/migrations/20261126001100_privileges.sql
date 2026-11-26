-- Privilèges explicites des rôles de l'API (docs/04 §4.1).
-- Les projets Supabase récents n'accordent plus automatiquement de droits sur les nouvelles
-- tables : sans ces GRANT, même un utilisateur connecté et habilité serait refusé.
-- La RLS reste le verrou : ces droits ne donnent accès qu'aux lignes autorisées par les politiques.
-- anon ne reçoit aucun droit ; utilisateurs_autorises reste inaccessible à tous les rôles de l'API.

grant usage on schema public to authenticated;

grant select on public.mandants, public.habilitations to authenticated;

grant select, insert, update, delete on
  public.types_prise_alimentaire,
  public.aliments,
  public.recettes,
  public.compositions_recette,
  public.plats_prepares,
  public.prises_alimentaires,
  public.elements_prise_alimentaire,
  public.cibles_nutritionnelles,
  public.poids_reference
to authenticated;

grant execute on function public.cibles_de_depart() to authenticated;
