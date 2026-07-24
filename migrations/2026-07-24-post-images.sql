-- Run this once in the Supabase SQL editor if your project was created
-- before photo posts were added. Safe to re-run.

alter table public.posts add column if not exists image_url text;

-- Content becomes optional now that a post can be image-only.
alter table public.posts alter column content drop not null;
alter table public.posts alter column content set default '';

alter table public.posts drop constraint if exists posts_content_check;
alter table public.posts add constraint posts_content_check check (char_length(content) <= 500);

alter table public.posts drop constraint if exists posts_content_or_image;
alter table public.posts add constraint posts_content_or_image
  check (char_length(content) > 0 or image_url is not null);
