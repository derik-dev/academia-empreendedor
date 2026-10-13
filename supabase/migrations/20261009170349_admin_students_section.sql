-- Permite que admins atualizem perfis de alunos (ex.: corrigir nome).
-- A remoção de alunos é feita via Edge Function com service_role key;
-- ao apagar o usuário em auth.users o perfil é removido em cascata.
drop policy if exists "Admins can update student profiles" on public.profiles;
create policy "Admins can update student profiles" on public.profiles
  for update to authenticated
  using (public.is_academy_admin())
  with check (public.is_academy_admin());
