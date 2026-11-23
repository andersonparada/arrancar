-- La auditoría de los enlaces contables no se depura mientras exista la empresa: de ellos depende cómo se contabilizó cada
-- hecho (C. Com. arts. 368, 373 y 376; C. Trib. arts. 47 y 112). Corre como dueño, así que puede escribir en el
-- catálogo del core.
INSERT INTO "core"."recursos_de_auditoria_permanente" ("recurso", "motivo")
VALUES
  ('contabilidad.enlaces', 'Los enlaces de roles a cuentas explican cómo se contabilizó cada hecho mientras no prescriba la obligación (C. Com. arts. 368, 373 y 376; C. Trib. arts. 47 y 112)')
ON CONFLICT DO NOTHING;
