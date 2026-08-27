-- Materiais devem aceitar nome livre (ex: SAE-1020, ASTM A36), não só o enum fixo.
-- Achado ao analisar o iCut: campo de nome é texto livre + preço/kg + peso específico + espessura opcional.

alter table materials add column if not exists nome_livre text;
update materials set nome_livre = nome::text where nome_livre is null;
alter table materials alter column nome_livre set not null;
alter table materials drop column nome;
alter table materials rename column nome_livre to nome;

alter table materials add column if not exists espessura_mm numeric(8,3);
alter table materials add column if not exists is_padrao boolean not null default false;

drop type if exists material_name;
