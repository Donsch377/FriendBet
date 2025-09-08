-- Enable UUID generation
create extension if not exists "pgcrypto";

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  host_name text not null,
  created_at timestamp with time zone default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  name text not null,
  points integer not null default 100,
  created_at timestamp with time zone default now()
);

create table bets (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  creator_id uuid references users(id) on delete set null,
  question text not null,
  hidden_from uuid[] default '{}',
  created_at timestamp with time zone default now(),
  resolved boolean default false,
  outcome text
);

create table wagers (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid references bets(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  choice text not null,
  amount integer not null,
  created_at timestamp with time zone default now()
);
