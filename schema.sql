-- Run this first in the Supabase SQL editor for a new project.
-- Then run profile-trigger.sql.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar text,
  provider text not null default 'unknown',
  bio text not null default '' check (char_length(bio) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  symbol text,
  description text not null check (char_length(description) between 1 and 500),
  chain text not null default 'solana' check (chain in ('solana', 'ethereum', 'bsc', 'robinhood')),
  contract_address text,
  website text,
  twitter text,
  telegram text,
  discord text,
  logo text,
  banner text,
  pinned_announcement text,
  rules text[] not null default '{}',
  market_cap numeric,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'moderator', 'member')),
  created_at timestamptz not null default now(),
  primary key (community_id, profile_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 500),
  image_url text,
  created_at timestamptz not null default now(),
  constraint posts_content_or_image check (char_length(content) > 0 or image_url is not null)
);

create table if not exists public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 300),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 240),
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists communities_market_cap_idx on public.communities (market_cap desc nulls last);
create index if not exists communities_created_at_idx on public.communities (created_at desc);
create index if not exists posts_community_created_at_idx on public.posts (community_id, created_at desc);
create index if not exists community_members_profile_idx on public.community_members (profile_id);
create index if not exists notifications_profile_created_at_idx on public.notifications (profile_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Profiles are visible to everyone" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Communities are visible to everyone" on public.communities;
drop policy if exists "Authenticated users can create communities" on public.communities;
drop policy if exists "Owners can update communities" on public.communities;
drop policy if exists "Owners can delete communities" on public.communities;
drop policy if exists "Community members are visible to authenticated users" on public.community_members;
drop policy if exists "Authenticated users can join communities" on public.community_members;
drop policy if exists "Members can leave communities" on public.community_members;
drop policy if exists "Posts are visible to authenticated users" on public.posts;
drop policy if exists "Members can create posts" on public.posts;
drop policy if exists "Authors and moderators can delete posts" on public.posts;
drop policy if exists "Likes are visible to authenticated users" on public.likes;
drop policy if exists "Users can like as themselves" on public.likes;
drop policy if exists "Users can remove their own likes" on public.likes;
drop policy if exists "Comments are visible to authenticated users" on public.comments;
drop policy if exists "Users can comment as themselves" on public.comments;
drop policy if exists "Users can delete their own comments" on public.comments;
drop policy if exists "Users can read their own notifications" on public.notifications;
drop policy if exists "Users can mark their own notifications read" on public.notifications;

create policy "Profiles are visible to everyone"
  on public.profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Communities are visible to everyone"
  on public.communities for select
  using (true);

create policy "Authenticated users can create communities"
  on public.communities for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update communities"
  on public.communities for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners can delete communities"
  on public.communities for delete
  using (auth.uid() = owner_id);

create policy "Community members are visible to authenticated users"
  on public.community_members for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can join communities"
  on public.community_members for insert
  with check (
    auth.uid() = profile_id
    and (
      role = 'member'
      or exists (
        select 1 from public.communities c
        where c.id = community_members.community_id
          and c.owner_id = auth.uid()
      )
    )
  );

create policy "Members can leave communities"
  on public.community_members for delete
  using (auth.uid() = profile_id);

create policy "Posts are visible to authenticated users"
  on public.posts for select
  using (auth.role() = 'authenticated');

create policy "Members can create posts"
  on public.posts for insert
  with check (
    auth.uid() = profile_id
    and exists (
      select 1 from public.community_members cm
      where cm.community_id = posts.community_id
        and cm.profile_id = auth.uid()
    )
  );

create policy "Authors and moderators can delete posts"
  on public.posts for delete
  using (
    auth.uid() = profile_id
    or exists (
      select 1 from public.community_members cm
      where cm.community_id = posts.community_id
        and cm.profile_id = auth.uid()
        and cm.role in ('owner', 'moderator')
    )
  );

create policy "Likes are visible to authenticated users"
  on public.likes for select
  using (auth.role() = 'authenticated');

create policy "Users can like as themselves"
  on public.likes for insert
  with check (auth.uid() = profile_id);

create policy "Users can remove their own likes"
  on public.likes for delete
  using (auth.uid() = profile_id);

create policy "Comments are visible to authenticated users"
  on public.comments for select
  using (auth.role() = 'authenticated');

create policy "Users can comment as themselves"
  on public.comments for insert
  with check (auth.uid() = profile_id);

create policy "Users can delete their own comments"
  on public.comments for delete
  using (auth.uid() = profile_id);

create policy "Users can read their own notifications"
  on public.notifications for select
  using (auth.uid() = profile_id);

create policy "Users can mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
