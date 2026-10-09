-- Autoriza a conta administrativa dedicada da Academia.
-- A conta precisa existir em Supabase Auth antes de executar esta migration;
-- o trigger também aplica o papel se o usuário for criado depois.
create or replace function public.grant_academy_admin_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(new.email, '')) in (
    'ericeenio@gmail.com',
    'ericeenio@empreendedorsemdor.com'
  ) then
    insert into public.admin_users (user_id) values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

insert into public.admin_users (user_id)
select id
from auth.users
where lower(email) = 'ericeenio@empreendedorsemdor.com'
on conflict (user_id) do nothing;
