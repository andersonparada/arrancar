import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { LineaDeConcepto } from '../../../../core/contratos/bancos.contratos.js';
import type { MovimientoCreado, PagosEnBancos } from '../../puertos/puertos-de-pagos.js';
import { MODULO_DE_ORIGEN } from '../pagos/orden-a-bancos.js';

/** Lo común a las dos formas de retiro; `monto` va como texto con dos decimales. */
interface PeticionBase {
  /** `AAAA-MM-DD`; hoy si falta. Nunca futura. */
  fecha?: string;
  monto: string;
  /** Quién lleva el efectivo; con `custodioUsuarioId` se toma el nombre del usuario. */
  custodio?: string | null;
  custodioUsuarioId?: string | null;
  observaciones?: string | null;
}

/** Un cheque de la chequera, a nombre del custodio o de otro (nunca al portador) y no negociable por omisión. */
export interface PeticionDeRetiroEnCheque extends PeticionBase {
  forma: 'cheque';
  chequeraId: string;
  chequeId?: string;
  noNegociable?: boolean;
  paraAbonoEnCuenta?: boolean;
  beneficiario?: string | null;
}

/** Una nota de débito: retiro en ventanilla con boleta o en cajero; `referencia` es el número de la boleta o del comprobante. */
export interface PeticionDeRetiroEnNota extends PeticionBase {
  forma: 'nota_de_debito';
  cuentaBancariaId: string;
  referencia?: string | null;
}

export type PeticionDeRetiro = PeticionDeRetiroEnCheque | PeticionDeRetiroEnNota;

/** Lo que el caso de uso ya resolvió y Bancos necesita. */
export interface DatosParaElRetiro {
  retiroId: string;
  fecha: string;
  montoCentavos: number;
  beneficiario: string;
}

const conTexto = <C extends string>(clave: C, texto: string | null | undefined): { [K in C]?: string } =>
  (texto ? { [clave]: texto } : {}) as { [K in C]?: string };

/** Todo el retiro es efectivo para pagos mientras no se gaste: sin flujo hasta que se pague o se pierda. */
export const conceptosDelRetiro = (montoCentavos: number): LineaDeConcepto[] => [
  { claveDeSistema: 'efectivo_para_pagos', montoCentavos },
];

/** Lo que Bancos recibe en las dos formas: la fecha, el monto, el beneficiario, el concepto, las observaciones y el origen. */
const baseDeLaOrden = (pedido: PeticionDeRetiro, datos: DatosParaElRetiro) => ({
  fecha: datos.fecha,
  montoCentavos: datos.montoCentavos,
  beneficiario: datos.beneficiario,
  conceptos: conceptosDelRetiro(datos.montoCentavos),
  ...conTexto('observaciones', pedido.observaciones),
  origen: { modulo: MODULO_DE_ORIGEN, documentoId: datos.retiroId },
});

/** La orden a Bancos según la forma: emitir el cheque o registrar la nota de débito, con el retiro como origen. */
export function ordenarElRetiro(
  bancos: PagosEnBancos,
  operador: Operador,
  { pedido, datos }: { pedido: PeticionDeRetiro; datos: DatosParaElRetiro },
): Promise<MovimientoCreado> {
  const base = baseDeLaOrden(pedido, datos);
  if (pedido.forma === 'nota_de_debito') {
    return bancos.registrarNotaDeDebito(operador, {
      ...base,
      ...conTexto('referencia', pedido.referencia),
      cuentaBancariaId: pedido.cuentaBancariaId,
    });
  }
  return bancos.emitirCheque(operador, {
    ...base,
    ...conTexto('chequeId', pedido.chequeId),
    chequeraId: pedido.chequeraId,
    noNegociable: pedido.noNegociable ?? true,
    paraAbonoEnCuenta: pedido.paraAbonoEnCuenta ?? false,
  });
}
