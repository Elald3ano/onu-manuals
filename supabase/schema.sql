-- =============================================================================
-- onu-manuals · Esquema Supabase
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query
-- Orden: 1) schema.sql  2) seed.sql  3) crear usuario admin en Authentication
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla principal
-- -----------------------------------------------------------------------------
create table if not exists public.onus (
  id                  text primary key,
  brand               text not null,
  model               text not null,
  aliases             text[] not null default '{}',
  default_ip          text not null default '',
  username            text not null default '',
  password            text not null default '',
  login_ui_image      text not null default '',
  device_image        text,
  legacy_manuals      jsonb not null default '[]'::jsonb,
  interactive_manual  jsonb,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.onus is
  'Catálogo de ONUs. Las credenciales son de campo y se muestran a técnicos; no usar para secretos personales.';

create index if not exists onus_brand_idx on public.onus (brand);
create index if not exists onus_aliases_idx on public.onus using gin (aliases);

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_onus_updated_at on public.onus;
create trigger trg_onus_updated_at
before update on public.onus
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Permisos + Row Level Security
-- Lectura pública (catálogo offline). Escritura solo autenticada (admin).
-- -----------------------------------------------------------------------------
alter table public.onus enable row level security;

grant select on public.onus to anon, authenticated;
grant insert, update, delete on public.onus to authenticated;

drop policy if exists "onus_select_public" on public.onus;
create policy "onus_select_public"
  on public.onus for select
  to anon, authenticated
  using (true);

drop policy if exists "onus_insert_authenticated" on public.onus;
create policy "onus_insert_authenticated"
  on public.onus for insert
  to authenticated
  with check (true);

drop policy if exists "onus_update_authenticated" on public.onus;
create policy "onus_update_authenticated"
  on public.onus for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "onus_delete_authenticated" on public.onus;
create policy "onus_delete_authenticated"
  on public.onus for delete
  to authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- Realtime: cambios del catálogo en vivo (INSERT/UPDATE/DELETE)
-- -----------------------------------------------------------------------------
alter table public.onus replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'onus'
     ) then
    execute 'alter publication supabase_realtime add table public.onus';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Storage: bucket público de imágenes (lectura pública, escritura autenticada)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('onu-images', 'onu-images', true)
on conflict (id) do update set public = true;

drop policy if exists "onu_images_read_public" on storage.objects;
create policy "onu_images_read_public"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'onu-images');

drop policy if exists "onu_images_insert_authenticated" on storage.objects;
create policy "onu_images_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'onu-images');

drop policy if exists "onu_images_update_authenticated" on storage.objects;
create policy "onu_images_update_authenticated"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'onu-images')
  with check (bucket_id = 'onu-images');

drop policy if exists "onu_images_delete_authenticated" on storage.objects;
create policy "onu_images_delete_authenticated"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'onu-images');
