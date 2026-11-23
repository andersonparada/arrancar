import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { Bodega } from '../../servicios/bodegas.api';
import type { DepartamentoParaElegir, LocalidadParaElegir } from '../../servicios/ubicaciones.api';

const porTexto = (a: OpcionDeRegistro, b: OpcionDeRegistro) => (a.texto ?? '').localeCompare(b.texto ?? '', 'es');

const aOpciones = (registros: { id: string; nombre: string }[]): OpcionDeRegistro[] =>
  registros.map((registro) => ({ valor: registro.id as string | null, texto: registro.nombre })).sort(porTexto);

/** Las bodegas activas por nombre: una bodega inactiva no recibe movimientos nuevos. */
export const opcionesDeBodegasActivas = (bodegas: Bodega[]): OpcionDeRegistro[] => [
  { valor: null, texto: 'Elija la bodega' },
  ...aOpciones(bodegas.filter((bodega) => bodega.activo)),
];

/** Si el usuario solo tiene una bodega activa, es la que se propone: un clic menos. */
export function bodegaUnica(bodegas: Bodega[]): string | null {
  const activas = bodegas.filter((bodega) => bodega.activo);
  return activas.length === 1 ? activas[0]!.id : null;
}

export const opcionesDeConceptos = (conceptos: { id: string; nombre: string }[]): OpcionDeRegistro[] => [
  { valor: null, texto: 'Elija el concepto de gasto' },
  ...aOpciones(conceptos),
];

export const opcionesDeLocalidadesActivas = (localidades: LocalidadParaElegir[]): OpcionDeRegistro[] => [
  { valor: null, texto: 'Sin localidad' },
  ...aOpciones(localidades.filter((localidad) => localidad.activo)),
];

/** Los departamentos activos; si se eligió localidad, los de esa localidad y los que no tienen una. */
export function opcionesDeDepartamentosActivos(
  departamentos: DepartamentoParaElegir[],
  localidadId: string | null,
): OpcionDeRegistro[] {
  const visibles = departamentos.filter(
    (departamento) =>
      departamento.activo && (!localidadId || !departamento.localidadId || departamento.localidadId === localidadId),
  );
  return [{ valor: null, texto: 'Sin departamento' }, ...aOpciones(visibles)];
}
