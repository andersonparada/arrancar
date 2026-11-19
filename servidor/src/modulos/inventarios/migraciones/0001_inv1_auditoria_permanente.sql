-- INV-1: la auditoría del método de costeo, de los cierres y de los ajustes no se depura mientras exista la empresa
-- (catálogo de la migración 0024 del core). El método vale mientras exista la empresa y no se cambia sin autorización
-- de la SAT (ISR art. 41); los cierres y los ajustes (soporte de faltantes y su IVA) valen hasta que prescriba la
-- obligación (Código Tributario arts. 47 y 112). Corre como dueño, así que puede escribir en el catálogo del core.
INSERT INTO "core"."recursos_de_auditoria_permanente" ("recurso", "motivo")
VALUES
  ('inventarios.metodos-de-costeo', 'El método de costeo vale mientras exista la empresa y no se cambia sin autorización de la SAT (ISR art. 41)'),
  ('inventarios.cierres', 'Existencias valuadas de cada mes, mientras no prescriba la obligación (Código Tributario arts. 47 y 112)'),
  ('inventarios.ajustes', 'Soporte de faltantes y su IVA, mientras no prescriba la obligación (Código Tributario arts. 47 y 112)')
ON CONFLICT DO NOTHING;
