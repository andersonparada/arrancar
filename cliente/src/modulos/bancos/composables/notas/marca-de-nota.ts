import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { INSIGNIA_DE_APERTURA } from '../comunes/de-apertura';
import { marcaDeReversion } from '../movimientos/estado-de-reversion';
import { nombreDeModuloDeOrigen } from '../movimientos/origen-y-causa';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Movimiento } from '../../servicios/movimientos.api';
import type { EdicionDeNota } from './edicion-de-nota';

/** La etiqueta de una nota marcada: «Para <módulo>» (VC-0b: también «Para Cuentas por cobrar»). */
export const etiquetaDeMarca = (modulo: string): string => `Para ${nombreDeModuloDeOrigen(modulo)}`;

type ConMarca = Pick<Movimiento, 'anuladoEn' | 'revertidoEn' | 'revierteAId' | 'marcadaParaModulo'> &
  Partial<Pick<Movimiento, 'parteDeApertura'>>;

/** La etiqueta de la tarjeta: lo revertido o anulado manda; luego la marca para un módulo y la carga inicial. */
export function insigniaDeNota(nota: ConMarca): string | undefined {
  const reversion = marcaDeReversion(nota);
  if (reversion) return reversion;
  if (nota.marcadaParaModulo) return etiquetaDeMarca(nota.marcadaParaModulo);
  return nota.parteDeApertura ? INSIGNIA_DE_APERTURA : undefined;
}

/** «Marcar» se ofrece si el servidor dice que se puede y Cuentas por pagar está activo (es quien usa la marca). */
export const ofreceMarcar = (nota: Pick<Movimiento, 'puedeMarcar'>, cuentasPorPagarActivo: boolean): boolean =>
  nota.puedeMarcar && cuentasPorPagarActivo;

/** Lo generado por otro módulo no se corrige en Bancos (solo se anula con el aviso a ese módulo). */
export const generoOtroModulo = (nota: Pick<Movimiento, 'moduloDeOrigen'>): boolean => nota.moduloDeOrigen !== null;

/** La nota se corrige solo si no está revertida ni anulada y no la generó otro módulo ni la carga inicial (esa se corrige en Saldos iniciales). */
export const sePuedeCorregir = (nota: Pick<Movimiento, 'moduloDeOrigen'> & ConMarca): boolean =>
  marcaDeReversion(nota) === undefined && !generoOtroModulo(nota) && !nota.parteDeApertura;

/**
 * El módulo que debe estar activo para cambiar la nota y hoy no lo está, o `null`: lo que un módulo generó o marcó no
 * se cambia sin él (no hay quien revise sus reglas). El servidor lo rechazaría, así que la tarjeta no ofrece Anular,
 * Desmarcar, Eliminar ni Editar y lo explica. Aquí solo se vigila lo marcado y lo de Cuentas por pagar.
 */
export function moduloInactivoQueEspera(
  nota: Pick<Movimiento, 'moduloDeOrigen' | 'marcadaParaModulo'>,
  moduloActivo: (modulo: string) => boolean,
): string | null {
  const candidatos = [nota.marcadaParaModulo, nota.moduloDeOrigen === 'cuentas-por-pagar' ? nota.moduloDeOrigen : null];
  return candidatos.find((modulo): modulo is string => modulo !== null && !moduloActivo(modulo)) ?? null;
}

export const textoDeModuloInactivo = (modulo: string): string =>
  `Active ${nombreDeModuloDeOrigen(modulo)} para cambiar este movimiento: lo generó o lo marcó ese módulo.`;

/** Por qué no hay «Corregir» ni «Eliminar» en un movimiento de otro módulo; `null` si no aplica. */
export function explicacionDeOrigen(nota: Pick<Movimiento, 'moduloDeOrigen'>): string | null {
  if (!nota.moduloDeOrigen) return null;
  const modulo = nombreDeModuloDeOrigen(nota.moduloDeOrigen);
  return `Lo generó ${modulo}: aquí no se corrige ni se elimina; solo se anula, y ${modulo} revisa si se puede.`;
}

/** El reparto por concepto de la ficha: una línea por concepto con su parte; nada si no hay reparto. */
export function detallesDeDesglose(nota: Pick<Movimiento, 'desglose'>): DetalleDeRegistro[] {
  return nota.desglose.map((linea) => ({ etiqueta: `Reparto: ${linea.concepto}`, valor: formatearMonto(linea.monto) }));
}

/** La casilla «Para Cuentas por pagar» solo sale al registrar una nota de débito con el módulo activo. */
export const ofreceCasillaDeMarca = (edicion: Pick<EdicionDeNota, 'id' | 'tipo'>, activo: boolean): boolean =>
  activo && edicion.id === null && edicion.tipo === 'debito';

/** El resumen que se confirma antes de marcar. */
export function resumenDeMarcado(nota: Pick<Movimiento, 'monto' | 'referencia' | 'beneficiario'>): string {
  const detalle = nota.referencia ?? nota.beneficiario;
  return (
    `Se marcará la nota de débito${detalle ? ` «${detalle}»` : ''} por ${formatearMonto(nota.monto)} ` +
    'para que Cuentas por pagar la aplique a facturas de un proveedor. Pasa al concepto «Pago a proveedores».'
  );
}

/** Lo que explica la ventana al quitar la marca. */
export const TEXTO_DE_DESMARCADO =
  'La nota deja de estar disponible para Cuentas por pagar y pasa al concepto que elija. Si ya está ligada a facturas no se podrá desmarcar: primero anule lo que la liga.';
