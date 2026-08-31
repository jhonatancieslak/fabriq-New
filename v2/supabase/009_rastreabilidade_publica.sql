-- Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
-- Rastreabilidade pública via QR (qr_code da production_order).
-- Ordem não concluída: só status básico. Ordem concluída: etapas + fotos + operador.

create or replace function get_order_tracking(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order production_orders%rowtype;
  v_result jsonb;
begin
  select * into v_order from production_orders where qr_code = p_token;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  if v_order.status <> 'concluido' then
    return jsonb_build_object(
      'found', true,
      'status', v_order.status,
      'tipo', v_order.tipo,
      'iniciado_em', v_order.iniciado_em,
      'concluido', false
    );
  end if;

  select jsonb_build_object(
    'found', true,
    'status', v_order.status,
    'tipo', v_order.tipo,
    'iniciado_em', v_order.iniciado_em,
    'concluido_em', v_order.concluido_em,
    'concluido', true,
    'etapas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'numero_etapa', s.numero_etapa,
        'etapa', s.etapa,
        'status', s.status,
        'iniciado_em', s.iniciado_em,
        'concluido_em', s.concluido_em,
        'operador_nome', u.nome_completo,
        'fotos', coalesce((
          select jsonb_agg(jsonb_build_object(
            'storage_path', p.storage_path,
            'thumbnail_path', p.thumbnail_path,
            'tirada_em', p.tirada_em
          ) order by p.tirada_em)
          from production_order_photos p
          where p.production_order_stage_id = s.id
        ), '[]'::jsonb)
      ) order by s.numero_etapa)
      from production_order_stages s
      left join users u on u.id = s.operador_id
      where s.production_order_id = v_order.id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function get_order_tracking(text) to anon, authenticated;
