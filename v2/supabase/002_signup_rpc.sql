-- RPC de cadastro: cria empresa + subscrição trial (4 dias) + user ligado ao auth.uid() já autenticado.
-- Chamado pelo cliente logo após supabase.auth.signUp() (o auth.uid() já existe nesse ponto).

create or replace function signup_company(
  p_razao_social text,
  p_nif text,
  p_maquina_potencia text,
  p_maquina_dimensao text,
  p_nome_completo text,
  p_telefone text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Utilizador não autenticado';
  end if;

  if exists (select 1 from users where id = auth.uid()) then
    raise exception 'Utilizador já associado a uma empresa';
  end if;

  insert into companies (razao_social, nif, maquina_potencia, maquina_dimensao)
  values (p_razao_social, p_nif, p_maquina_potencia, p_maquina_dimensao)
  returning id into v_company_id;

  insert into subscriptions (company_id, plano, status, trial_ends_at)
  values (v_company_id, 'trial', 'trial', now() + interval '4 days');

  insert into users (id, company_id, nome_completo, email, telefone, role)
  values (auth.uid(), v_company_id, p_nome_completo, auth.email(), p_telefone, 'admin');

  insert into company_settings (company_id) values (v_company_id);

  insert into pricing_presets (company_id, nome, is_default)
  values (v_company_id, 'Padrão', true);

  return v_company_id;
end;
$$;

grant execute on function signup_company(text, text, text, text, text, text) to authenticated;
