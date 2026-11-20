-- Files are made smaller in the browser first (Instagram sizes), so storage limits can be tighter.
update storage.buckets set file_size_limit = 26214400 where id = 'business-photos';
update storage.buckets set file_size_limit = 2097152, allowed_mime_types = array['audio/mpeg'] where id = 'sounds';
