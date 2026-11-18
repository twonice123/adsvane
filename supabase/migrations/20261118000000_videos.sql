-- Short videos (up to 15 seconds) in posts. The video file is in `url`;
-- `poster_url` is a still picture shown on the grid before it plays.
alter table public.business_photos add column if not exists poster_url text;

-- Let the photos bucket take videos too, up to 50 MB each.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
where id = 'business-photos';
