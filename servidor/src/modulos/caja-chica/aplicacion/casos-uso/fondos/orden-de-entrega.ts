import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { LineaDeConcepto } from '../../../../core/contratos/bancos.contratos.js';
import { MODULO_DE_ORIGEN } from '../../../dominio/fondos.js';
import type { MovimientoCreado, FondosEnBancos } from '../../puertos/puertos-de-bancos.js';

/** Lo común a las dos formas de entregar el dinero al fondo; `monto` va como texto con dos decimales. */
interface EntregaBase {
  /** `AAAA-MM-DD`; hoy si falta. Nunca futura. */
  fecha?: string;
  monto: string;
  observaciones?: string | null;
}

/** Un cheque de la chequera, a nombre del custodio o de otro (nunca al portador) y no negociable por omisión. */
export interface EntregaEnCheque extends EntregaBase {
  forma: 'cheque';
  chequeraId: string;
  chequeId?: string;
  noNegociable?: boolean;
  beneficiario?: string | null;
}

/** Una nota de débito; `referencia` es el número de la boleta o del comprobante. */
export interface EntregaEnNota extends EntregaBase {
  forma: 'nota_de_debito';
  cuentaBancariaId: string;
  referencia?: string | null;
}

/** Así sale el dinero del banco hacia el fondo: en la apertura y en cada aumento. */
export type PeticionDeEntrega = EntregaEnCheque | EntregaEnNota;

/** Lo que el caso de uso ya resolvió y Bancos necesita. */
export interface DatosDeLaEntrega {
  fondoId: string;
  fecha: string;
  montoCentavos: number;
  beneficiario: string;
}

const conTexto = <C extends string>(clave: C, texto: string | null | undefined): { [K in C]?: string } =>
  (texto ? { [clave]: texto } : {}) as { [K in C]?: string };

/** Todo lo que sale hacia el fondo es «Fondo de caja chica»: sin flujo hasta que se gaste y se reponga. */
export const conceptosDeLaEntrega = (montoCentavos: number): LineaDeConcepto[] => [
  { claveDeSistema: 'fondo_de_caja_chica', montoCentavos },
];

const baseDeLaOrden = (pedido: PeticionDeEntrega, datos: DatosDeLaEntrega) => ({
  fecha: datos.fecha,
  montoCentavos: datos.montoCentavos,
  beneficiario: datos.beneficiario,
  conceptos: conceptosDeLaEntrega(datos.montoCentavos),
  ...conTexto('observaciones', pedido.observaciones),
  origen: { modulo: MODULO_DE_ORIGEN, documentoId: datos.fondoId },
});

/** La orden a Bancos según la forma: emitir el cheque o registrar la nota de débito, con el fondo como origen. */
export function ordenarLaEntrega(
  bancos: FondosEnBancos,
  operador: Operador,
  { pedido, datos }: { pedido: PeticionDeEntrega; datos: DatosDeLaEntrega },
): Promise<MovimientoCreado> {
  const base = baseDeLaOrden(pedido, datos);
  if (pedido.forma === 'nota_de_debito') {
    return bancos.registrarNota(operador, {
      ...base,
      ...conTexto('referencia', pedido.referencia),
      tipo: 'debito',
      cuentaBancariaId: pedido.cuentaBancariaId,
    });
  }
  return bancos.emitirCheque(operador, {
    ...base,
    ...conTexto('chequeId', pedido.chequeId),
    chequeraId: pedido.chequeraId,
    noNegociable: pedido.noNegociable ?? true,
  });
}
