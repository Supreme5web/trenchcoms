-- Run this once in the Supabase SQL editor, after schema.sql.
-- Auto-creates a profiles row whenever a new auth.users row appears
-- (i.e. right after a successful Google/X OAuth sign-in), so the app
-- never has to race the client-side fallback in AuthContext.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int;
begin
  base_username := lower(regexp_replace(coalesce(
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'preferred_username',
    split_part(new.email, '@', 1),
    'user'
  ), '[^a-z0-9_]', '', 'g'));

  if base_username = '' then
    base_username := 'user';
  end if;

  final_username := base_username;
  suffix := 0;

  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar, provider)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', base_username),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    coalesce(new.raw_app_meta_data->>'provider', 'unknown')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
