import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import type { DatosParaSugerir, OpcionSugerida, SugerenciaDeMovimiento } from '../../servicios/sugerencias.api';

/** Los campos de una nota o un cheque que sirven para proponer su concepto. */
export interface CamposParaSugerir {
  cuentaBancariaId: string | null;
  fecha: string;
  monto: string | number;
  beneficiario: string;
  referencia: string;
  observaciones: string;
}

const texto = (valor: string | number): string => String(valor).trim();
const sinVacio = (valor: string | number): string | undefined => texto(valor) || undefined;

/**
 * Lo que se le pregunta al servidor, o `null` si todavía no vale la pena: hace falta la cuenta y algo escrito en el
 * beneficiario o la referencia (sin texto solo habría cuenta y monto, y eso no distingue nada). Lo vacío no se manda.
 */
export function datosParaSugerir(campos: CamposParaSugerir): DatosParaSugerir | null {
  if (!campos.cuentaBancariaId) return null;
  if (!texto(campos.beneficiario) && !texto(campos.referencia)) return null;
  return {
    cuentaBancariaId: campos.cuentaBancariaId,
    fecha: sinVacio(campos.fecha),
    monto: sinVacio(campos.monto),
    beneficiario: sinVacio(campos.beneficiario),
    referencia: sinVacio(campos.referencia),
    observaciones: sinVacio(campos.observaciones),
  };
}

const sePuedeElegir = (opcion: OpcionSugerida, opciones: readonly OpcionDeRegistro[]): boolean =>
  opciones.some((o) => o.valor === opcion.conceptoId);

/**
 * Lo que se muestra bajo el selector: nada si ya hay un concepto elegido (nunca pisa lo elegido) y, si no, el
 * sugerido y las alternativas que de verdad están entre las opciones de la pantalla. Sin nada útil, `null`.
 */
export function sugerenciaParaMostrar(
  sugerencia: SugerenciaDeMovimiento | null,
  opciones: readonly OpcionDeRegistro[],
  conceptoElegido: string | null,
): SugerenciaDeMovimiento | null {
  if (!sugerencia || conceptoElegido) return null;
  const sugerido = sugerencia.sugerido && sePuedeElegir(sugerencia.sugerido, opciones) ? sugerencia.sugerido : null;
  const alternativas = sugerencia.alternativas.filter((opcion) => sePuedeElegir(opcion, opciones));
  return sugerido || alternativas.length ? { ...sugerencia, sugerido, alternativas } : null;
}
