-- AF-1: la auditoría de los activos, sus costos, mejoras, saldos iniciales, bajas y cierres no se depura mientras
-- exista la empresa (catálogo de la migración 0024 del core). Un edificio se deprecia 20 años: los 60 meses de
-- conservación de la auditoría no alcanzan. Corre como dueño, así que puede escribir en el catálogo del core.
INSERT INTO "core"."recursos_de_auditoria_permanente" ("recurso", "motivo")
VALUES
  ('activos-fijos.activos', 'Documentos de costo mientras se deprecia el bien, más la prescripción (Código Tributario arts. 112 "A" y 47; ISR art. 26)'),
  ('activos-fijos.costos', 'Documentos de costo mientras se deprecia el bien, más la prescripción (Código Tributario arts. 112 "A" y 47; ISR art. 26)'),
  ('activos-fijos.mejoras', 'Documentos de costo mientras se deprecia el bien, más la prescripción (Código Tributario arts. 112 "A" y 47; ISR art. 26)'),
  ('activos-fijos.saldos-iniciales', 'Documentos de costo mientras se deprecia el bien, más la prescripción (Código Tributario arts. 112 "A" y 47; ISR art. 26)'),
  ('activos-fijos.bajas', 'Documentos de costo mientras se deprecia el bien, más la prescripción (Código Tributario arts. 112 "A" y 47; ISR art. 26)'),
  ('activos-fijos.cierres', 'Documentos de costo mientras se deprecia el bien, más la prescripción (Código Tributario arts. 112 "A" y 47; ISR art. 26)')
ON CONFLICT DO NOTHING;
