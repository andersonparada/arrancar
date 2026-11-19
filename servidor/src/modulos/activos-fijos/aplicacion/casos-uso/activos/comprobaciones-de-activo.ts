import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { UbicacionDeActivo } from '../../../dominio/activo.js';
import type { Clase } from '../../../dominio/clase.js';
import {
  ActivoInvalido,
  ComponenteDeUnComponente,
  DepartamentoDeOtraLocalidad,
  FechaAnteriorAlInicio,
} from '../../../dominio/errores-de-activo.js';
import type { DependenciasDeActivos } from './dependencias-de-activos.js';

type Comprobador = Pick<DependenciasDeActivos, 'repositorio' | 'clases' | 'ubicaciones' | 'cargaInicial' | 'reloj'>;

/**
 * @throws RecursoNoEncontrado si la clase no existe; ActivoInvalido si está inactiva, salvo que sea la que el activo
 * ya tiene (`claseActualId`): inactivar una clase no impide corregir sus activos.
 */
export async function claseParaActivo(
  { clases }: Comprobador,
  claseId: string,
  claseActualId: string | null = null,
): Promise<Clase> {
  const clase = await clases.buscar(Identificador.desde(claseId));
  if (!clase) throw new RecursoNoEncontrado('La clase de activo');
  if (!clase.instantanea().activo && claseId !== claseActualId)
    throw new ActivoInvalido('La clase de activo está inactiva: elija otra.');
  return clase;
}

/** Un componente se cuelga de un activo principal (un solo nivel) y nunca de sí mismo ni cuando ya tiene componentes. */
export async function validarPadre(
  { repositorio }: Comprobador,
  { padreId, activoId }: { padreId: string | null; activoId: string | null },
): Promise<void> {
  if (!padreId) return;
  if (padreId === activoId) throw new ActivoInvalido('Un activo no puede ser componente de sí mismo.');
  const padre = await repositorio.buscar(Identificador.desde(padreId));
  if (!padre) throw new RecursoNoEncontrado('El activo principal');
  const tieneComponentes = activoId ? await repositorio.tieneComponentes(Identificador.desde(activoId)) : false;
  if (padre.instantanea().activoPadreId !== null || tieneComponentes) throw new ComponenteDeUnComponente();
}

async function localidadActiva({ ubicaciones }: Pick<Comprobador, 'ubicaciones'>, id: string | null): Promise<void> {
  if (!id) return;
  const localidad = await ubicaciones.localidad(id);
  if (!localidad?.activo) throw new RecursoNoEncontrado('La localidad');
}

/** El departamento debe estar activo y ser de toda la empresa o de la localidad elegida. */
async function departamentoCoherente(
  { ubicaciones }: Pick<Comprobador, 'ubicaciones'>,
  { localidadId, departamentoId }: Pick<UbicacionDeActivo, 'localidadId' | 'departamentoId'>,
): Promise<void> {
  if (!departamentoId) return;
  const departamento = await ubicaciones.departamento(departamentoId);
  if (!departamento?.activo) throw new RecursoNoEncontrado('El departamento');
  if (departamento.localidadId && departamento.localidadId !== localidadId) throw new DepartamentoDeOtraLocalidad();
}

/**
 * La localidad y el departamento deben existir en la empresa (aunque el usuario no los vea en Empresas), estar
 * activos y ser coherentes entre sí.
 */
export async function validarUbicacion(
  comprobador: Pick<Comprobador, 'ubicaciones'>,
  ubicacion: Pick<UbicacionDeActivo, 'localidadId' | 'departamentoId'>,
): Promise<void> {
  await localidadActiva(comprobador, ubicacion.localidadId);
  await departamentoCoherente(comprobador, ubicacion);
}

/**
 * @throws FechaAnteriorAlInicio si es anterior a la fecha de inicio de la empresa (va como saldo inicial).
 * @throws ActivoInvalido si es posterior a hoy.
 */
export async function validarFechaDeAdquisicion(
  { cargaInicial, reloj }: Comprobador,
  { operador, fecha }: { operador: Operador; fecha: string },
): Promise<void> {
  if (fecha > (await reloj.hoy(operador))) throw new ActivoInvalido('La fecha de adquisición no puede ser futura.');
  const { fechaDeInicio } = await cargaInicial.obtener(operador);
  if (fechaDeInicio && fecha < fechaDeInicio) throw new FechaAnteriorAlInicio(fechaDeInicio);
}
