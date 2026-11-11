-- Several photos posted together form one post that people swipe through.
alter table public.business_photos add column if not exists post_id uuid;
alter table public.business_photos add column if not exists position smallint not null default 0;
create index if not exists business_photos_post_idx on public.business_photos(post_id) where post_id is not null;
