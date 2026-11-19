import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { Activo, UbicacionesDeActivos } from '../../servicios/activos.api';
import type { Clase } from '../../servicios/clases.api';
import { activosQueRecibenCostos } from './validar-capitalizacion';

/** Las opciones de un selector ordenadas por nombre, con la vacía primero. */
function ordenadas(vacia: string, opciones: OpcionDeRegistro[]): OpcionDeRegistro[] {
  const lista = [...opciones].sort((a, b) => a.texto.localeCompare(b.texto, 'es'));
  return [{ valor: null, texto: vacia }, ...lista];
}

/** Las clases activas, por nombre. */
export const opcionesDeClases = (clases: readonly Clase[]): OpcionDeRegistro[] =>
  ordenadas(
    'Elija una clase',
    clases.filter((clase) => clase.activo).map((clase) => ({ valor: clase.id, texto: clase.nombre })),
  );

/** Los activos que pueden recibir un costo (no dados de baja ni de terceros), por descripción. */
export const opcionesDeActivos = (activos: readonly Activo[]): OpcionDeRegistro[] =>
  ordenadas(
    'Elija un activo',
    activosQueRecibenCostos(activos).map((activo) => ({
      valor: activo.id,
      texto: `${activo.descripcion} (${activo.codigo})`,
    })),
  );

export const opcionesDeLocalidades = (ubicaciones: UbicacionesDeActivos): OpcionDeRegistro[] =>
  ordenadas(
    'Sin elegir',
    ubicaciones.localidades.map((localidad) => ({ valor: localidad.id, texto: localidad.nombre })),
  );

/** Los departamentos de toda la empresa o de la localidad elegida. */
export const opcionesDeDepartamentos = (
  ubicaciones: UbicacionesDeActivos,
  localidadId: string | null,
): OpcionDeRegistro[] =>
  ordenadas(
    'Sin elegir',
    ubicaciones.departamentos
      .filter((departamento) => departamento.localidadId === null || departamento.localidadId === localidadId)
      .map((departamento) => ({ valor: departamento.id, texto: departamento.nombre })),
  );
