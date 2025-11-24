
-- DRIVER EXTENDED TABLES

create table if not exists driver_profile (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers(id) on delete cascade,
  license_number varchar(64) not null,
  date_of_birth date,
  address text,
  emergency_contact jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table driver_profile enable row level security;
create policy if not exists driver_profile_select on driver_profile for select using (true);
create policy if not exists driver_profile_modify on driver_profile for all using (true) with check (true);

create table if not exists driver_settings (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers(id) on delete cascade,
  notifications_enabled boolean default true,
  auto_accept_orders boolean default false,
  preferred_language varchar(10) default 'ru',
  preferred_zone uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table driver_settings enable row level security;
create policy if not exists driver_settings_select on driver_settings for select using (true);
create policy if not exists driver_settings_modify on driver_settings for all using (true) with check (true);

create table if not exists driver_status (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers(id) on delete cascade,
  status varchar(50) not null,
  reason text,
  effective_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table driver_status enable row level security;
create policy if not exists driver_status_select on driver_status for select using (true);
create policy if not exists driver_status_modify on driver_status for all using (true) with check (true);

create table if not exists driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers(id) on delete cascade,
  document_type varchar(50) not null,
  document_number varchar(100),
  issued_at date,
  expires_at date,
  file_url text,
  created_at timestamptz default now()
);

alter table driver_documents enable row level security;
create policy if not exists driver_documents_select on driver_documents for select using (true);
create policy if not exists driver_documents_modify on driver_documents for all using (true) with check (true);


-- ZONE DOMAIN

create table if not exists zones (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  description text,
  color varchar(16),
  created_at timestamptz default now()
);

alter table zones enable row level security;
create policy if not exists zones_select on zones for select using (true);
create policy if not exists zones_modify on zones for all using (true) with check (true);

create table if not exists zone_streets (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references zones(id) on delete cascade,
  street_name text not null,
  created_at timestamptz default now()
);

alter table zone_streets enable row level security;
create policy if not exists zone_streets_select on zone_streets for select using (true);
create policy if not exists zone_streets_modify on zone_streets for all using (true) with check (true);

create table if not exists zone_driver (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references zones(id) on delete cascade,
  driver_id uuid not null references drivers(id) on delete cascade,
  assigned_at timestamptz default now()
);

alter table zone_driver enable row level security;
create policy if not exists zone_driver_select on zone_driver for select using (true);
create policy if not exists zone_driver_modify on zone_driver for all using (true) with check (true);


-- ORDER DOMAIN

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  external_id varchar(64),
  customer_name text,
  customer_phone varchar(32),
  status varchar(50) default 'new',
  priority varchar(20) default 'normal',
  scheduled_at timestamptz,
  created_at timestamptz default now()
);

alter table orders enable row level security;
create policy if not exists orders_select on orders for select using (true);
create policy if not exists orders_modify on orders for all using (true) with check (true);

create table if not exists order_points (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  point_type varchar(20) not null,
  sequence int not null,
  address text not null,
  latitude decimal(10,8),
  longitude decimal(11,8),
  planned_at timestamptz,
  completed_at timestamptz
);

alter table order_points enable row level security;
create policy if not exists order_points_select on order_points for select using (true);
create policy if not exists order_points_modify on order_points for all using (true) with check (true);

create table if not exists order_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  driver_id uuid references drivers(id) on delete set null,
  status varchar(30) default 'pending',
  assigned_at timestamptz default now()
);

alter table order_assignments enable row level security;
create policy if not exists order_assignments_select on order_assignments for select using (true);
create policy if not exists order_assignments_modify on order_assignments for all using (true) with check (true);

create table if not exists order_status_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status varchar(50) not null,
  note text,
  created_at timestamptz default now()
);

alter table order_status_logs enable row level security;
create policy if not exists order_status_logs_select on order_status_logs for select using (true);
create policy if not exists order_status_logs_modify on order_status_logs for all using (true) with check (true);

create table if not exists order_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  point_id uuid references order_points(id) on delete set null,
  url text not null,
  description text,
  created_at timestamptz default now()
);

alter table order_photos enable row level security;
create policy if not exists order_photos_select on order_photos for select using (true);
create policy if not exists order_photos_modify on order_photos for all using (true) with check (true);

create table if not exists customer_signatures (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  signer_name text,
  signed_at timestamptz,
  signature_url text
);

alter table customer_signatures enable row level security;
create policy if not exists customer_signatures_select on customer_signatures for select using (true);
create policy if not exists customer_signatures_modify on customer_signatures for all using (true) with check (true);


-- ROUTE DOMAIN

create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete set null,
  name text,
  status varchar(30) default 'planned',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table routes enable row level security;
create policy if not exists routes_select on routes for select using (true);
create policy if not exists routes_modify on routes for all using (true) with check (true);

create table if not exists route_points (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes(id) on delete cascade,
  sequence int not null,
  latitude decimal(10,8),
  longitude decimal(11,8),
  reached_at timestamptz
);

alter table route_points enable row level security;
create policy if not exists route_points_select on route_points for select using (true);
create policy if not exists route_points_modify on route_points for all using (true) with check (true);

create table if not exists route_logs (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes(id) on delete cascade,
  message text not null,
  created_at timestamptz default now()
);

alter table route_logs enable row level security;
create policy if not exists route_logs_select on route_logs for select using (true);
create policy if not exists route_logs_modify on route_logs for all using (true) with check (true);


-- SHIFT DOMAIN

create table if not exists shift_events (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts(id) on delete cascade,
  event_type varchar(40) not null,
  payload jsonb,
  created_at timestamptz default now()
);

alter table shift_events enable row level security;
create policy if not exists shift_events_select on shift_events for select using (true);
create policy if not exists shift_events_modify on shift_events for all using (true) with check (true);


-- DEVICE DOMAIN

create table if not exists device_sessions (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id) on delete cascade,
  started_at timestamptz default now(),
  ended_at timestamptz,
  status varchar(30) default 'active'
);

alter table device_sessions enable row level security;
create policy if not exists device_sessions_select on device_sessions for select using (true);
create policy if not exists device_sessions_modify on device_sessions for all using (true) with check (true);

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id) on delete cascade,
  token text not null,
  platform varchar(20),
  created_at timestamptz default now(),
  revoked_at timestamptz
);

alter table push_tokens enable row level security;
create policy if not exists push_tokens_select on push_tokens for select using (true);
create policy if not exists push_tokens_modify on push_tokens for all using (true) with check (true);


-- ALERT DOMAIN

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type varchar(50) not null,
  severity varchar(20) default 'info',
  message text,
  status varchar(20) default 'open',
  created_at timestamptz default now(),
  resolved_at timestamptz
);

alter table alerts enable row level security;
create policy if not exists alerts_select on alerts for select using (true);
create policy if not exists alerts_modify on alerts for all using (true) with check (true);

create table if not exists alert_actions (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references alerts(id) on delete cascade,
  action text not null,
  actor text,
  comment text,
  created_at timestamptz default now()
);

alter table alert_actions enable row level security;
create policy if not exists alert_actions_select on alert_actions for select using (true);
create policy if not exists alert_actions_modify on alert_actions for all using (true) with check (true);


-- LOGS DOMAIN

create table if not exists system_logs (
  id uuid primary key default gen_random_uuid(),
  log_level varchar(20) default 'info',
  message text not null,
  context jsonb,
  created_at timestamptz default now()
);

alter table system_logs enable row level security;
create policy if not exists system_logs_select on system_logs for select using (true);
create policy if not exists system_logs_modify on system_logs for all using (true) with check (true);

create table if not exists api_logs (
  id uuid primary key default gen_random_uuid(),
  method varchar(10),
  path text,
  status_code int,
  duration_ms int,
  created_at timestamptz default now()
);

alter table api_logs enable row level security;
create policy if not exists api_logs_select on api_logs for select using (true);
create policy if not exists api_logs_modify on api_logs for all using (true) with check (true);

create table if not exists app_errors (
  id uuid primary key default gen_random_uuid(),
  source varchar(50),
  message text,
  stack_trace text,
  created_at timestamptz default now()
);

alter table app_errors enable row level security;
create policy if not exists app_errors_select on app_errors for select using (true);
create policy if not exists app_errors_modify on app_errors for all using (true) with check (true);


-- foreign keys that require previously created tables
alter table driver_settings
  add constraint if not exists driver_settings_zone_fk foreign key (preferred_zone) references zones(id) on delete set null;


