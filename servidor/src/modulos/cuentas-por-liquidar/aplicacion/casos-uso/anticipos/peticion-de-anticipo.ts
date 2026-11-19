import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { LineaDeConcepto } from '../../../../core/contratos/bancos.contratos.js';
import { MODULO_DE_ORIGEN, type ClaseDeAnticipo } from '../../../dominio/anticipos.js';
import type { MovimientoCreado, OrdenesABancos } from '../../puertos/puertos-de-bancos.js';

/** Lo común a las dos formas de entrega; `monto` va como texto con dos decimales. */
interface PeticionBase {
  /** El tercero de la cuenta que recibe el dinero. */
  beneficiarioId: string;
  /** Decide si lo no liquidado puede ir a «renta del trabajo». */
  esEmpleado: boolean;
  /** El usuario de Arrancar que es el beneficiario, si lo es. */
  beneficiarioUsuarioId?: string | null;
  clase: ClaseDeAnticipo;
  descripcion: string;
  localidadId?: string | null;
  monto: string;
  /** `AAAA-MM-DD`; hoy si falta. Nunca futura. */
  fecha?: string;
  /** `AAAA-MM-DD`; si falta, la entrega más los días de la configuración. */
  fechaLimite?: string;
  /** Con el bloqueo de vencidos encendido y el permiso de excepción: por qué se entrega a quien tiene vencidos. */
  motivoConVencidos?: string | null;
  /** Si quien pide tiene el permiso `anticipos.con-vencidos` (lo pone el controlador). */
  puedeConVencidos: boolean;
}

/** Un cheque de la chequera a nombre del beneficiario (nunca al portador) y no negociable por omisión. */
export interface PeticionDeAnticipoEnCheque extends PeticionBase {
  forma: 'cheque';
  chequeraId: string;
  chequeId?: string;
  noNegociable?: boolean;
}

/** Una nota de débito (transferencia a la cuenta del beneficiario); `referencia` es el número de la transferencia. */
export interface PeticionDeAnticipoEnNota extends PeticionBase {
  forma: 'nota_de_debito';
  cuentaBancariaId: string;
  referencia?: string | null;
}

export type PeticionDeAnticipo = PeticionDeAnticipoEnCheque | PeticionDeAnticipoEnNota;

/** Lo que el caso de uso ya resolvió y Bancos necesita. */
export interface DatosParaElAnticipo {
  anticipoId: string;
  fecha: string;
  montoCentavos: number;
  /** El nombre del tercero: a nombre de quién va el cheque o la nota. */
  beneficiario: string;
}

const conTexto = <C extends string>(clave: C, texto: string | null | undefined): { [K in C]?: string } =>
  (texto ? { [clave]: texto } : {}) as { [K in C]?: string };

/** Todo el anticipo es «anticipo por liquidar» (sin flujo) hasta que se liquide. */
export const conceptosDelAnticipo = (montoCentavos: number): LineaDeConcepto[] => [
  { claveDeSistema: 'anticipo_por_liquidar', montoCentavos },
];

const baseDeLaOrden = (pedido: PeticionDeAnticipo, datos: DatosParaElAnticipo) => ({
  fecha: datos.fecha,
  montoCentavos: datos.montoCentavos,
  beneficiario: datos.beneficiario,
  conceptos: conceptosDelAnticipo(datos.montoCentavos),
  observaciones: pedido.descripcion.trim(),
  origen: { modulo: MODULO_DE_ORIGEN, documentoId: datos.anticipoId },
});

/** La orden a Bancos según la forma: emitir el cheque o registrar la nota de débito, con el anticipo como origen. */
export function ordenarElAnticipo(
  bancos: OrdenesABancos,
  operador: Operador,
  { pedido, datos }: { pedido: PeticionDeAnticipo; datos: DatosParaElAnticipo },
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
  });
}
