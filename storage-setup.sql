-- Run this once in the Supabase SQL editor, after schema.sql.
-- Creates one public bucket ("media") used for community banners/logos
-- and post photos. Files are organized by folder: banners/, logos/, posts/.

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "Media is publicly readable" on storage.objects;
drop policy if exists "Authenticated users can upload media" on storage.objects;
drop policy if exists "Users can update their own media" on storage.objects;
drop policy if exists "Users can delete their own media" on storage.objects;

-- Anyone can view uploaded images (banners/logos/post photos are public content).
create policy "Media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'media');

-- Any signed-in user can upload. Files are named `<folder>/<user-id>-<ts>.<ext>`,
-- so this also lets us restrict updates/deletes to the file's owner below.
create policy "Authenticated users can upload media"
  on storage.objects for insert
  with check (bucket_id = 'media' and auth.role() = 'authenticated');

create policy "Users can update their own media"
  on storage.objects for update
  using (bucket_id = 'media' and owner = auth.uid());

create policy "Users can delete their own media"
  on storage.objects for delete
  using (bucket_id = 'media' and owner = auth.uid());
