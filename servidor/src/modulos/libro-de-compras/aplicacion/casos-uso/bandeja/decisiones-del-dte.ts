import type { DestinoDeDocumento } from '../../../dominio/destinos-de-documento.js';
import type { DteRecibido } from '../../../dominio/dte-recibido.js';
import {
  DteNotaSinFactura,
  DteSinConcepto,
  DteSinDestino,
  FaltaLaFechaDeRecepcion,
} from '../../../dominio/errores-de-bandeja.js';
import { esNota, FAMILIA_DEL_TIPO_DTE } from '../../../dominio/tipos-de-documento.js';
import type { DatosFiscalesPedidos } from '../../../dominio/datos-fiscales-del-documento.js';
import type { PropuestaDeDteDto } from '../../dto/dte-recibido.dto.js';
import type { SolicitudSinResolver } from '../../dto/solicitud-de-documento.js';
import type { DecisionesDelDte, SolicitudDesdeElDte } from './solicitud-desde-el-dte.js';

/**
 * Lo que vale para la fila: lo que el usuario completó y, si falta, la propuesta. La recepción de una empresa agente de
 * IVA no se supone: queda `null` hasta que el usuario la escribe o aplica la propuesta.
 */
export function decisionesDe(
  dte: DteRecibido,
  propuesta: PropuestaDeDteDto,
  extras: Pick<DecisionesDelDte, 'datosFiscales' | 'tasaDeIva'>,
): DecisionesDelDte {
  const borrador = dte.instantanea();
  return {
    proveedorId: borrador.proveedorId ?? propuesta.proveedorId,
    conceptoId: borrador.conceptoId ?? propuesta.conceptoId,
    destino: borrador.destino ?? propuesta.destino,
    fechaRecepcion: borrador.fechaRecepcion ?? (propuesta.recepcionObligatoria ? null : propuesta.fechaRecepcion),
    periodo: borrador.periodo,
    ...extras,
  };
}

/** Los datos fiscales que el usuario contesta por proveedor: la clave es su id o, si aún es nuevo, el NIT del emisor. */
export type DatosFiscalesPorProveedor = Readonly<Record<string, DatosFiscalesPedidos>>;

/** Lo que el usuario contestó para el proveedor de la fila, por su id o por el NIT del emisor (el proveedor nuevo ya creado sigue valiendo por NIT). */
export function datosFiscalesDe(
  dte: DteRecibido,
  propuesta: PropuestaDeDteDto,
  porProveedor: DatosFiscalesPorProveedor = {},
): DatosFiscalesPedidos | null {
  const { proveedorId, nitEmisor } = dte.instantanea();
  const id = proveedorId ?? propuesta.proveedorId;
  return (id ? porProveedor[id] : undefined) ?? porProveedor[nitEmisor] ?? null;
}

/** Lo que debe estar decidido para registrar: el concepto y el destino ya no pueden faltar. */
export interface DecisionesCompletas {
  conceptoId: string;
  destino: DestinoDeDocumento;
}

/**
 * Revisa que a la fila no le falte nada que el registro no pueda proponer, en el orden en que el usuario lo completa.
 * @throws FaltaLaFechaDeRecepcion, DteSinConcepto, DteSinDestino o DteNotaSinFactura.
 */
export function exigirCompleto(dte: DteRecibido, decisiones: DecisionesDelDte): DecisionesCompletas {
  const datos = dte.instantanea();
  const { fechaRecepcion, conceptoId, destino } = decisiones;
  if (fechaRecepcion === null) throw new FaltaLaFechaDeRecepcion();
  if (conceptoId === null) throw new DteSinConcepto();
  if (destino === null) throw new DteSinDestino();
  if (esNota(FAMILIA_DEL_TIPO_DTE[datos.tipoDte]) && datos.documentoAfectadoId === null) throw new DteNotaSinFactura();
  return { conceptoId, destino };
}

/** La solicitud lista para `RegistrarDocumento`, con el proveedor ya resuelto. */
export function solicitudCompleta(
  solicitud: SolicitudDesdeElDte,
  completas: Pick<DecisionesCompletas, 'conceptoId'> & { proveedorId: string; destino: DestinoDeDocumento | null },
): SolicitudSinResolver {
  const { proveedorId, conceptoId, destino } = completas;
  return { ...solicitud, proveedorId, destino, lineas: solicitud.lineas.map((linea) => ({ ...linea, conceptoId })) };
}
