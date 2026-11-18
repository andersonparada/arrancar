import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { marcaDeReversion } from '../movimientos/estado-de-reversion';
import { nombreDeModuloDeOrigen } from '../movimientos/origen-y-causa';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Movimiento } from '../../servicios/movimientos.api';
import type { EdicionDeNota } from './edicion-de-nota';

export const ETIQUETA_DE_MARCA = 'Para Cuentas por pagar';

type ConMarca = Pick<Movimiento, 'anuladoEn' | 'revertidoEn' | 'revierteAId' | 'marcadaParaCuentasPorPagar'>;

/** La etiqueta de la tarjeta: lo revertido o anulado manda; si no, la marca para Cuentas por pagar. */
export function insigniaDeNota(nota: ConMarca): string | undefined {
  return marcaDeReversion(nota) ?? (nota.marcadaParaCuentasPorPagar ? ETIQUETA_DE_MARCA : undefined);
}

/** «Marcar» se ofrece si el servidor dice que se puede y Cuentas por pagar está activo (es quien usa la marca). */
export const ofreceMarcar = (nota: Pick<Movimiento, 'puedeMarcar'>, cuentasPorPagarActivo: boolean): boolean =>
  nota.puedeMarcar && cuentasPorPagarActivo;

/** Lo generado por otro módulo no se corrige en Bancos (solo se anula con el aviso a ese módulo). */
export const generoOtroModulo = (nota: Pick<Movimiento, 'moduloDeOrigen'>): boolean => nota.moduloDeOrigen !== null;

/** La nota se corrige solo si no está revertida ni anulada y no la generó otro módulo. */
export const sePuedeCorregir = (nota: Pick<Movimiento, 'moduloDeOrigen'> & ConMarca): boolean =>
  marcaDeReversion(nota) === undefined && !generoOtroModulo(nota);

/**
 * Con Cuentas por pagar apagado, lo que ese módulo generó o marcó no se cambia (no hay quien revise sus reglas): el
 * servidor lo rechazaría, así que la tarjeta no ofrece Anular, Desmarcar, Eliminar ni Editar y lo explica.
 */
export const esperaACuentasPorPagarInactivo = (
  nota: Pick<Movimiento, 'moduloDeOrigen' | 'marcadaParaCuentasPorPagar'>,
  cuentasPorPagarActivo: boolean,
): boolean =>
  !cuentasPorPagarActivo && (nota.marcadaParaCuentasPorPagar || nota.moduloDeOrigen === 'cuentas-por-pagar');

export const TEXTO_DE_CUENTAS_POR_PAGAR_INACTIVO =
  'Active Cuentas por pagar para cambiar este movimiento: lo generó o lo marcó ese módulo.';

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
