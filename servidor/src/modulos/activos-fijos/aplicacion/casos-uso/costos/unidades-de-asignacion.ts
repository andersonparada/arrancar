import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Activo } from '../../../dominio/activo.js';
import type { IncisoFiscal } from '../../../dominio/incisos-fiscales.js';
import type { LineaCapitalizable } from '../../../dominio/linea-capitalizable.js';
import type { DatosDeActivo } from '../../../dominio/reglas-de-activo.js';
import type { DetalleDeUnidad, SolicitudDeActivoNuevo } from '../../dto/capitalizacion.dto.js';
import {
  claseParaActivo,
  validarFechaDeAdquisicion,
  validarPadre,
  validarUbicacion,
} from '../activos/comprobaciones-de-activo.js';
import type { DependenciasDeCostos } from './dependencias-de-costos.js';
import { llaveDeUnidad } from './codigos-de-unidades.js';

/** Los activos que nacen de una asignación de la bandeja, con la compra conjunta que los une y el inciso de su clase. */
export interface UnidadesCreadas {
  activos: Activo[];
  altaConjuntaId: string | null;
  incisoFiscal: IncisoFiscal;
}

interface EntradaDeUnidades {
  indice: number;
  solicitud: SolicitudDeActivoNuevo;
  linea: LineaCapitalizable;
  codigos: ReadonlyMap<string, string>;
}

/** El renglón que no se escribió: todo se completa después en la ficha. */
const SIN_DETALLE: DetalleDeUnidad = { codigo: null, numeroDeSerie: null, placa: null, marca: null, modelo: null };

/** Lo común a todas las unidades de la asignación; la fecha de adquisición es la del documento. */
function datosComunes({
  solicitud,
  linea,
}: EntradaDeUnidades): Omit<DatosDeActivo, 'codigo' | 'marca' | 'modelo' | 'numeroDeSerie' | 'placa'> {
  return {
    descripcion: solicitud.descripcion,
    claseId: solicitud.claseId,
    activoPadreId: solicitud.activoPadreId,
    tipoDeRegistro: solicitud.tipoDeRegistro,
    origen: solicitud.origen,
    propietario: null,
    formaDeTenencia: null,
    fechaDeAdquisicion: linea.fechaEmision,
    valorComoGanadoComun: solicitud.valorComoGanadoComun,
    valorDeMatricula: solicitud.valorDeMatricula,
    valorCatastral: solicitud.valorCatastral,
    valoresDelInmuebleCompleto: solicitud.valoresDelInmuebleCompleto,
    cantidad: solicitud.cantidadPorActivo,
    observaciones: solicitud.observaciones,
  };
}

/** Los datos del activo de la unidad `renglon`: lo común de la asignación y, encima, lo que escribió en su renglón. */
function datosDeLaUnidad(entrada: EntradaDeUnidades, renglon: number): DatosDeActivo {
  const { indice, solicitud, codigos } = entrada;
  const detalle = solicitud.detalleDeUnidades[renglon] ?? SIN_DETALLE;
  return {
    ...datosComunes(entrada),
    codigo: codigos.get(llaveDeUnidad(indice, renglon))!,
    marca: detalle.marca ?? solicitud.marca,
    modelo: detalle.modelo ?? solicitud.modelo,
    numeroDeSerie: detalle.numeroDeSerie,
    placa: detalle.placa,
  };
}

/** Las comprobaciones de la asignación que miran la base: clase activa, fecha, componente y ubicación. */
async function comprobarAsignacion(
  dependencias: DependenciasDeCostos,
  operador: Operador,
  { solicitud, linea }: EntradaDeUnidades,
): Promise<IncisoFiscal> {
  const clase = await claseParaActivo(dependencias, solicitud.claseId);
  await validarFechaDeAdquisicion(dependencias, { operador, fecha: linea.fechaEmision });
  await validarPadre(dependencias, { padreId: solicitud.activoPadreId, activoId: null });
  await validarUbicacion(dependencias, solicitud);
  return clase.instantanea().incisoFiscal;
}

/**
 * Crea (sin guardar) los activos de una asignación: `unidades` activos de `cantidadPorActivo` piezas, con su ubicación,
 * su clase y la fecha del documento. Si son varios, todos comparten una compra conjunta (`alta_conjunta_id`).
 * @throws RecursoNoEncontrado, ActivoInvalido, FechaAnteriorAlInicio, DepartamentoDeOtraLocalidad u otro error del activo.
 */
export async function crearUnidades(
  dependencias: DependenciasDeCostos,
  operador: Operador,
  entrada: EntradaDeUnidades,
): Promise<UnidadesCreadas> {
  const { solicitud } = entrada;
  const incisoFiscal = await comprobarAsignacion(dependencias, operador, entrada);
  const altaConjuntaId = solicitud.unidades > 1 ? crypto.randomUUID() : null;
  const { localidadId, departamentoId, responsable, enBodega } = solicitud;
  const activos = Array.from({ length: solicitud.unidades }, (_, renglon) =>
    Activo.crear(
      Identificador.desde(operador.empresaId),
      {
        datos: datosDeLaUnidad(entrada, renglon),
        ubicacion: { localidadId, departamentoId, responsable, enBodega },
        altaConjuntaId,
      },
      incisoFiscal,
    ),
  );
  return { activos, altaConjuntaId, incisoFiscal };
}
