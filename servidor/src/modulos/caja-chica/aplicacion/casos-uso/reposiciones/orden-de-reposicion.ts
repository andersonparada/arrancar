import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { LineaDeConcepto } from '../../../../core/contratos/bancos.contratos.js';
import { MODULO_DE_ORIGEN } from '../../../dominio/fondos.js';
import type { DesgloseDeReposicion } from '../../../dominio/reposiciones.js';
import type { FondosEnBancos, MovimientoCreado } from '../../puertos/puertos-de-bancos.js';

/** Un cheque de la chequera, a nombre del custodio o de otro (nunca al portador) y no negociable por omisión. */
export interface ReposicionEnCheque {
  forma: 'cheque';
  chequeraId: string;
  chequeId?: string;
  noNegociable?: boolean;
  beneficiario?: string | null;
}

/** Una nota de débito; `referencia` es el número de la boleta o del comprobante. */
export interface ReposicionEnNota {
  forma: 'nota_de_debito';
  cuentaBancariaId: string;
  referencia?: string | null;
}

/** Cómo sale el dinero del banco para reponer el fondo. */
export type FormaDePagoDeLaReposicion = ReposicionEnCheque | ReposicionEnNota;

/** Lo que el caso de uso ya resolvió y Bancos necesita. */
export interface DatosDeLaOrden {
  reposicionId: string;
  fecha: string;
  montoCentavos: number;
  beneficiario: string;
  desglose: DesgloseDeReposicion;
  observaciones?: string | null;
}

/** Los conceptos de Bancos de la reposición (§3.2 del diseño); las partes en cero no van. */
export function conceptosDeLaReposicion(desglose: DesgloseDeReposicion): LineaDeConcepto[] {
  const partes: LineaDeConcepto[] = [
    { claveDeSistema: 'reintegro_de_caja_chica', montoCentavos: desglose.operacionCentavos },
    { claveDeSistema: 'reintegro_de_caja_chica_de_activo', montoCentavos: desglose.activoCentavos },
    { claveDeSistema: 'faltante_de_efectivo', montoCentavos: desglose.faltanteCentavos },
  ];
  return partes.filter(({ montoCentavos }) => montoCentavos > 0);
}

const baseDeLaOrden = (datos: DatosDeLaOrden) => ({
  fecha: datos.fecha,
  montoCentavos: datos.montoCentavos,
  beneficiario: datos.beneficiario,
  conceptos: conceptosDeLaReposicion(datos.desglose),
  ...(datos.observaciones ? { observaciones: datos.observaciones } : {}),
  origen: { modulo: MODULO_DE_ORIGEN, documentoId: datos.reposicionId },
});

/** La orden a Bancos según la forma: emitir el cheque o registrar la nota de débito, con la reposición como origen. */
export function ordenarLaReposicion(
  bancos: FondosEnBancos,
  operador: Operador,
  { pago, datos }: { pago: FormaDePagoDeLaReposicion; datos: DatosDeLaOrden },
): Promise<MovimientoCreado> {
  const base = baseDeLaOrden(datos);
  if (pago.forma === 'nota_de_debito') {
    return bancos.registrarNota(operador, {
      ...base,
      ...(pago.referencia ? { referencia: pago.referencia } : {}),
      tipo: 'debito',
      cuentaBancariaId: pago.cuentaBancariaId,
    });
  }
  return bancos.emitirCheque(operador, {
    ...base,
    ...(pago.chequeId ? { chequeId: pago.chequeId } : {}),
    chequeraId: pago.chequeraId,
    noNegociable: pago.noNegociable ?? true,
  });
}
