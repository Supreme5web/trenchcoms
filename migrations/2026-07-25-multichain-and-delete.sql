-- Run this once in the Supabase SQL editor if your project predates
-- multi-chain support / community deletion. Safe to re-run.

alter table public.communities add column if not exists chain text not null default 'solana';
alter table public.communities drop constraint if exists communities_chain_check;
alter table public.communities add constraint communities_chain_check
  check (chain in ('solana', 'ethereum', 'bsc', 'robinhood'));

alter table public.notifications add column if not exists link text;

drop policy if exists "Owners can delete communities" on public.communities;
create policy "Owners can delete communities"
  on public.communities for delete
  using (auth.uid() = owner_id);
