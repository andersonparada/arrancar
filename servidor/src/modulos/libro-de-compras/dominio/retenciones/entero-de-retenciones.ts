import { normalizarSerieONumero } from '../documento-de-compra.js';
import { primerDiaDelMes } from '../periodo-del-libro.js';
import {
  DocumentoDePagoInvalido,
  FechaDePagoInvalida,
  GrupoDeEnteroInvalido,
  MesDelEnteroInvalido,
  MontoDelEnteroInvalido,
  MotivoDeAnulacionDelEnteroInvalido,
  ObservacionesDelEnteroInvalidas,
} from './errores-de-retenciones.js';
import { grupoDeEnteroValido, type GrupoDeEntero } from './grupo-de-entero.js';

const MAXIMO_DEL_DOCUMENTO = 40;
const MAXIMO_DEL_TEXTO = 300;
const MES = /^\d{4}-(0[1-9]|1[0-2])(-01)?$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Lo que el usuario escribe al marcar un mes y grupo como enterado; el monto, en centavos. */
export interface PeticionDeEntero {
  mes: string;
  grupo: string;
  fechaDePago: string;
  documentoDePago: string;
  monto: number;
  observaciones?: string | null;
}

/** El entero ya revisado, listo para guardar. */
export interface DatosDelEntero {
  mes: string;
  grupo: GrupoDeEntero;
  fechaDePago: string;
  documentoDePago: string;
  monto: number;
  observaciones: string | null;
}

/** `AAAA-MM` o `AAAA-MM-01` → el primer día del mes; @throws MesDelEnteroInvalido. */
export function mesDelEnteroValido(mes: string): string {
  if (!MES.test(mes)) throw new MesDelEnteroInvalido();
  return primerDiaDelMes(mes.length === 7 ? `${mes}-01` : mes);
}

function textoOpcional(texto: string | null | undefined): string | null {
  const limpio = texto?.trim() ?? '';
  if (limpio.length === 0) return null;
  if (limpio.length > MAXIMO_DEL_TEXTO) throw new ObservacionesDelEnteroInvalidas();
  return limpio;
}

function fechaDePagoValida(fecha: string, mes: string): string {
  if (!FECHA.test(fecha) || Number.isNaN(Date.parse(fecha)) || fecha < mes) throw new FechaDePagoInvalida();
  return fecha;
}

function documentoDePagoValido(documento: string): string {
  const limpio = normalizarSerieONumero(documento);
  if (limpio.length === 0 || limpio.length > MAXIMO_DEL_DOCUMENTO) throw new DocumentoDePagoInvalido();
  return limpio;
}

/**
 * Revisa lo que escribió el usuario: mes (primer día), grupo conocido, fecha de pago no anterior al mes, formulario o
 * boleta de 1 a 40 caracteres sin espacios, monto mayor que cero y observaciones de hasta 300.
 */
export function enteroValido(peticion: PeticionDeEntero): DatosDelEntero {
  const mes = mesDelEnteroValido(peticion.mes);
  const grupo = grupoDeEnteroValido(peticion.grupo);
  if (!grupo) throw new GrupoDeEnteroInvalido();
  if (!Number.isInteger(peticion.monto) || peticion.monto <= 0) throw new MontoDelEnteroInvalido();
  return {
    mes,
    grupo,
    fechaDePago: fechaDePagoValida(peticion.fechaDePago, mes),
    documentoDePago: documentoDePagoValido(peticion.documentoDePago),
    monto: peticion.monto,
    observaciones: textoOpcional(peticion.observaciones),
  };
}

/** El motivo de anular un entero: de 1 a 300 caracteres. */
export function motivoDeAnulacionDelEnteroValido(motivo: string): string {
  const limpio = motivo.trim();
  if (limpio.length === 0 || limpio.length > MAXIMO_DEL_TEXTO) throw new MotivoDeAnulacionDelEnteroInvalido();
  return limpio;
}
