-- Groups that hold members and bets
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  host_name text not null,
  join_code text not null unique,
  created_at timestamptz default now()
);

-- Members belonging to a group
create table members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  name text not null,
  points int default 100,
  created_at timestamptz default now()
);

-- Bets created in a group
create table bets (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  creator_id uuid references members(id) on delete set null,
  creator_name text,
  description text not null,
  created_at timestamptz default now()
);

-- Users blocked from seeing a bet
create table bet_blocks (
  bet_id uuid references bets(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  primary key (bet_id, member_id)
);

-- open access policies (no auth)
alter table groups enable row level security;
create policy "Allow all" on groups for all using (true);

alter table members enable row level security;
create policy "Allow all" on members for all using (true);

alter table bets enable row level security;
create policy "Allow all" on bets for all using (true);

alter table bet_blocks enable row level security;
create policy "Allow all" on bet_blocks for all using (true);
