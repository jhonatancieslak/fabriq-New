-- Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
-- Policies do bucket production-photos: path convention {company_id}/{stage_id}/{filename}.
-- authenticated só mexe na pasta da própria empresa; anon só lê (fotos aparecem na
-- rastreabilidade pública /t/<token> quando a ordem está concluída).

create policy "production-photos: authenticated insert own company"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'production-photos'
  and (storage.foldername(name))[1] = auth_company_id()::text
);

create policy "production-photos: authenticated select own company"
on storage.objects for select to authenticated
using (
  bucket_id = 'production-photos'
  and (storage.foldername(name))[1] = auth_company_id()::text
);

create policy "production-photos: authenticated delete own company"
on storage.objects for delete to authenticated
using (
  bucket_id = 'production-photos'
  and (storage.foldername(name))[1] = auth_company_id()::text
);

create policy "production-photos: public read"
on storage.objects for select to anon
using (bucket_id = 'production-photos');
