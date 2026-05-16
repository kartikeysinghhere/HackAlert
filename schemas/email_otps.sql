create table if not exists email_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  otp text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_otps_email_used_expires
  on email_otps (email, used, expires_at desc);
