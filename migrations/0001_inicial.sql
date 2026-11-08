-- Lista de compras do apartamento: cômodos e itens.
-- Dinheiro em centavos inteiros. Datas e horas em texto ISO (UTC).
-- Lição do app de finanças: CHECK com NULL passa. Toda coluna que não pode
-- faltar é NOT NULL.

CREATE TABLE comodos (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE CHECK (length(trim(nome)) BETWEEN 1 AND 40),
  -- Nome do ícone (ver src/lib/Icone.svelte). Em português, para o banco não
  -- depender da biblioteca de ícones.
  icone TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  -- Cômodo da planta 3D (shared/planta.ts). NULL = cômodo sem maquete.
  area TEXT UNIQUE CHECK (area IS NULL OR area IN ('cozinha', 'servico', 'sala', 'bwc', 'quarto1', 'quarto2'))
);

CREATE TABLE itens (
  id INTEGER PRIMARY KEY,
  -- Gerada no aparelho. Se a rede falhar e o app reenviar, o banco recusa a
  -- cópia em vez de cadastrar o item duas vezes.
  chave TEXT NOT NULL UNIQUE CHECK (length(chave) BETWEEN 8 AND 64),
  comodo_id INTEGER NOT NULL REFERENCES comodos (id),
  nome TEXT NOT NULL CHECK (length(trim(nome)) BETWEEN 1 AND 120),
  quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade BETWEEN 1 AND 999),
  prioridade TEXT NOT NULL DEFAULT 'logo' CHECK (prioridade IN ('essencial', 'logo', 'um_dia')),
  -- Preço estimado POR UNIDADE. NULL = ainda não pesquisaram.
  estimado_centavos INTEGER CHECK (estimado_centavos IS NULL OR estimado_centavos BETWEEN 1 AND 100000000000),
  -- Quanto pagaram NO TOTAL (todas as unidades). NULL = não informaram.
  pago_centavos INTEGER CHECK (pago_centavos IS NULL OR pago_centavos BETWEEN 0 AND 100000000000),
  link TEXT CHECK (link IS NULL OR (length(link) <= 2000 AND (link LIKE 'https://%' OR link LIKE 'http://%'))),
  obs TEXT CHECK (obs IS NULL OR length(obs) <= 500),
  comprado INTEGER NOT NULL DEFAULT 0 CHECK (comprado IN (0, 1)),
  comprado_em TEXT,
  comprado_por TEXT,
  criado_por TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  atualizado_em TEXT,
  -- Comprado e data andam juntos: nunca um sem o outro.
  CHECK ((comprado = 1) = (comprado_em IS NOT NULL))
);

CREATE INDEX itens_comodo ON itens (comodo_id, comprado);

INSERT INTO comodos (nome, icone, ordem, area) VALUES
  ('Cozinha', 'panela', 1, 'cozinha'),
  ('Lavanderia', 'lavadora', 2, 'servico'),
  ('Sala de estar', 'sofa', 3, 'sala'),
  ('Quarto', 'cama', 4, 'quarto1'),
  ('Banheiro', 'banheira', 5, 'bwc'),
  ('Quarto de visita / Escritório', 'notebook', 6, 'quarto2');
