-- Storage buckets
insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', false)
on conflict do nothing;

insert into storage.buckets (id, name, public)
values ('quiz-documents', 'quiz-documents', false)
on conflict do nothing;

-- Quiz document uploads (teacher scoped folders)
create policy "quiz_docs_teacher_write"
on storage.objects
for insert
with check (
  bucket_id = 'quiz-documents'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "quiz_docs_teacher_read"
on storage.objects
for select
using (
  bucket_id = 'quiz-documents'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Student photos: teacher-only reads; writes via signed URL
create policy "student_photos_teacher_read"
on storage.objects
for select
using (
  bucket_id = 'student-photos'
  and auth.uid() is not null
);
