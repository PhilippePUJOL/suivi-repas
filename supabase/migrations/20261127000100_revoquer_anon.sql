-- Aucun droit pour le rôle anon sur les tables du schéma public (docs/04 §4.1).
-- Rend le comportement identique quel que soit le réglage par défaut du projet Supabase
-- (les anciennes instances accordaient automatiquement des droits à anon).
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
