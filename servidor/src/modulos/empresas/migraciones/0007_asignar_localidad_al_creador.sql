-- H5b: quien crea una localidad queda con acceso a ella. La función es del core y hace lo mismo para cualquier
-- tabla de accesos; no actúa al importar desde Excel (`app.sin_asignar_al_crear`) ni sin usuario en la transacción.
-- Corre como el dueño de la tabla (sin RLS): si algún día se fuerza RLS en las tablas, este disparador deja de funcionar.
CREATE TRIGGER asignar_al_creador AFTER INSERT ON empresas.localidades
  FOR EACH ROW EXECUTE FUNCTION core.asignar_registro_al_creador('empresas.accesos_a_localidades', 'localidad_id');
