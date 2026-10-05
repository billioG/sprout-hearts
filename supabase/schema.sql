create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  pin text unique not null,
  created_at timestamptz default now(),
  player1_id text,
  player1_name text,
  player1_avatar text default 'lpc',
  player1_x float default 15,
  player1_y float default 11,
  player2_id text,
  player2_name text,
  player2_avatar text default 'partner',
  player2_x float default 16,
  player2_y float default 11,
  current_level int default 1,
  answers jsonb default '{}'::jsonb
);

create index if not exists idx_rooms_pin on public.rooms(pin);

alter publication supabase_realtime add table public.rooms;

alter table public.rooms enable row level security;

create policy "Permitir lectura pública" on public.rooms for select using (true);
create policy "Permitir inserción pública" on public.rooms for insert with check (true);
create policy "Permitir actualización pública" on public.rooms for update using (true);
