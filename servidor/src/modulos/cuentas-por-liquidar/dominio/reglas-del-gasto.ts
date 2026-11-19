import { quetzales } from './avisos-de-anticipos.js';
import {
  FechaDelGastoInvalida,
  MontoDelGastoInvalido,
  MotivoConRetencionNoAplica,
  MotivoConRetencionObligatorio,
  RentaDelTrabajoSoloEmpleados,
  TextoDelGastoInvalido,
} from './errores-de-gastos.js';
import { fechaLegible } from './fechas.js';
import type { Gasto, TratamientoSinDocumento } from './gastos.js';

const MAXIMO_DEL_MOTIVO = 300;

/** Como se lee un documento del libro: `A-123` o `123` si no tiene serie. */
export const etiquetaDelDocumento = (documento: { serie: string | null; numero: string }): string =>
  documento.serie ? `${documento.serie}-${documento.numero}` : documento.numero;

/** @throws MontoDelGastoInvalido si no es mayor que cero. */
export function exigirMontoDelGasto(montoCentavos: number): number {
  if (montoCentavos <= 0) throw new MontoDelGastoInvalido();
  return montoCentavos;
}

/** Entre la entrega del anticipo y hoy. */
export interface LimitesDeFecha {
  /** La fecha de la entrega del anticipo. */
  entrega: string;
  hoy: string;
}

/**
 * La fecha del gasto: ya ocurrió (no es futura) y no es anterior a la entrega del anticipo, que es cuando el beneficiario
 * recibió el dinero.
 * @throws FechaDelGastoInvalida
 */
export function exigirFechaDelGasto(fecha: string, { entrega, hoy }: LimitesDeFecha): void {
  if (fecha > hoy) throw new FechaDelGastoInvalida('El gasto no puede tener fecha futura.');
  if (fecha < entrega) {
    throw new FechaDelGastoInvalida(
      `El gasto no puede ser anterior a la entrega del anticipo (${fechaLegible(entrega)}).`,
    );
  }
}

/** Lo que se necesita para decidir si un documento con o sin retención se asigna (§5.4 g y §7.2). */
export interface RevisionDeRetencion {
  gasto: Pick<Gasto, 'conRetencion' | 'montoRetenidoCentavos'>;
  etiqueta: string;
  motivo?: string | null;
}

/**
 * El motivo de la excepción de retención, que es lo que se guarda: sin retención no hay motivo (y uno escrito se rechaza, no
 * se guarda lo que no aplica); con retención hace falta uno.
 * El permiso de excepción lo revisa quien llama antes (es de la sesión, no del dominio).
 * @throws MotivoConRetencionNoAplica, MotivoConRetencionObligatorio
 */
export function motivoDeLaRetencion({ gasto, etiqueta, motivo }: RevisionDeRetencion): string | null {
  const escrito = motivo?.trim() ?? '';
  if (!gasto.conRetencion) {
    if (escrito !== '') throw new MotivoConRetencionNoAplica(etiqueta);
    return null;
  }
  if (escrito === '' || escrito.length > MAXIMO_DEL_MOTIVO) throw new MotivoConRetencionObligatorio(etiqueta);
  return escrito;
}

/** El texto de la retención para los mensajes: `Q90.00`. */
export const retenidoLegible = (gasto: Pick<Gasto, 'montoRetenidoCentavos'>): string =>
  quetzales(gasto.montoRetenidoCentavos);

/** Cómo se llama un texto del gasto (el campo y cómo se dice en el mensaje) y su tope. */
export interface ReglaDeTexto {
  campo: string;
  nombre: string;
  maximo: number;
}

/** Un texto del gasto sin documento: escrito y dentro de su tope. */
export function textoDelGasto(valor: string, { campo, nombre, maximo }: ReglaDeTexto): string {
  const limpio = valor.trim();
  if (limpio.length === 0 || limpio.length > maximo) throw new TextoDelGastoInvalido(campo, nombre, maximo);
  return limpio;
}

/**
 * El tratamiento del gasto sin documento: por omisión no deducible (V-6, por validar); renta del trabajo solo si el
 * beneficiario es empleado.
 * @throws RentaDelTrabajoSoloEmpleados
 */
export function tratamientoDelGastoSinDocumento(
  pedido: TratamientoSinDocumento | undefined,
  esEmpleado: boolean,
): TratamientoSinDocumento {
  const tratamiento = pedido ?? 'no_deducible';
  if (tratamiento === 'renta_del_trabajo' && !esEmpleado) throw new RentaDelTrabajoSoloEmpleados();
  return tratamiento;
}

/** La fecha contable de quitar un gasto: hoy, nunca antes de la fecha del propio gasto. */
export const fechaDeQuitarElGasto = (gasto: Pick<Gasto, 'fecha'>, hoy: string): string =>
  hoy > gasto.fecha ? hoy : gasto.fecha;
