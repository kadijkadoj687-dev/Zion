create table if not exists public.player_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  player_name text not null default '' check (char_length(player_name) between 0 and 18),
  unlocked_world integer not null default 0 check (unlocked_world between 0 and 4),
  best_score integer not null default 0 check (best_score between 0 and 1000000000),
  customization jsonb not null default '{"weapon":"lightblade","outfit":"wayfarer","hairstyle":"breeze","accessory":"halo"}'::jsonb
    check (
      jsonb_typeof(customization) = 'object'
      and customization ?& array['weapon', 'outfit', 'hairstyle', 'accessory']
      and customization->>'weapon' in ('lightblade', 'sunstaff', 'twinblades')
      and customization->>'outfit' in ('wayfarer', 'starguard', 'sunweave', 'moonpetal')
      and customization->>'hairstyle' in ('breeze', 'starlight', 'midnight', 'rose')
      and customization->>'accessory' in ('none', 'halo', 'leaf', 'star')
    ),
  updated_at timestamptz not null default now()
);

alter table public.player_saves enable row level security;

create policy "Players can read their own save"
  on public.player_saves for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Players can create their own save"
  on public.player_saves for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Players can update their own save"
  on public.player_saves for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.player_saves to authenticated;
