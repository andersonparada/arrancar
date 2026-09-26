INSERT INTO "core"."monedas" ("codigo", "nombre", "simbolo", "decimales") VALUES
  ('GTQ', 'Quetzal', 'Q', 2),
  ('USD', 'Dólar estadounidense', 'US$', 2)
ON CONFLICT ("codigo") DO NOTHING;
