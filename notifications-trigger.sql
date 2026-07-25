-- Run this once in the Supabase SQL editor, after schema.sql.
-- Turns likes / replies / community joins into real rows in
-- public.notifications, so the Notifications page actually has something
-- to show instead of relying on the client to remember to write one.
-- Safe to re-run.

-- ---- Liked post ------------------------------------------------------
create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  v_slug text;
  v_actor_name text;
begin
  select p.profile_id, c.slug into v_owner_id, v_slug
  from public.posts p
  join public.communities c on c.id = p.community_id
  where p.id = new.post_id;

  -- Don't notify people about liking their own post.
  if v_owner_id is null or v_owner_id = new.profile_id then
    return new;
  end if;

  select display_name into v_actor_name from public.profiles where id = new.profile_id;

  insert into public.notifications (profile_id, body, link)
  values (
    v_owner_id,
    coalesce(v_actor_name, 'Someone') || ' liked your post',
    '/app/community/' || v_slug
  );

  return new;
end;
$$;

drop trigger if exists on_like_created on public.likes;
create trigger on_like_created
  after insert on public.likes
  for each row execute procedure public.notify_on_like();

-- ---- Replied to post ---------------------------------------------------
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  v_slug text;
  v_actor_name text;
begin
  select p.profile_id, c.slug into v_owner_id, v_slug
  from public.posts p
  join public.communities c on c.id = p.community_id
  where p.id = new.post_id;

  if v_owner_id is null or v_owner_id = new.profile_id then
    return new;
  end if;

  select display_name into v_actor_name from public.profiles where id = new.profile_id;

  insert into public.notifications (profile_id, body, link)
  values (
    v_owner_id,
    coalesce(v_actor_name, 'Someone') || ' replied to your post',
    '/app/community/' || v_slug
  );

  return new;
end;
$$;

drop trigger if exists on_comment_created on public.comments;
create trigger on_comment_created
  after insert on public.comments
  for each row execute procedure public.notify_on_comment();

-- ---- Joined community ---------------------------------------------------
create or replace function public.notify_on_join()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  v_slug text;
  v_name text;
  v_actor_name text;
begin
  select owner_id, slug, name into v_owner_id, v_slug, v_name
  from public.communities where id = new.community_id;

  -- Don't notify the owner that they "joined" their own community
  -- (this fires once when a community is created and the owner is added).
  if v_owner_id is null or v_owner_id = new.profile_id then
    return new;
  end if;

  select display_name into v_actor_name from public.profiles where id = new.profile_id;

  insert into public.notifications (profile_id, body, link)
  values (
    v_owner_id,
    coalesce(v_actor_name, 'Someone') || ' joined ' || coalesce(v_name, 'your community'),
    '/app/community/' || v_slug
  );

  return new;
end;
$$;

drop trigger if exists on_member_joined on public.community_members;
create trigger on_member_joined
  after insert on public.community_members
  for each row execute procedure public.notify_on_join();
