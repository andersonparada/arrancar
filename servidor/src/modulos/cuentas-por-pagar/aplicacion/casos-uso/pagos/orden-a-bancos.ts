import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { LineaDeConcepto } from '../../../../core/contratos/bancos.contratos.js';
import type { MovimientoCreado, PagosEnBancos } from '../../puertos/puertos-de-pagos.js';
import type { LineaRevisada } from './dependencias-de-pagos.js';
import type { PeticionDePago } from './peticion-de-pago.js';

/** El módulo que origina los movimientos de Bancos. */
export const MODULO_DE_ORIGEN = 'cuentas-por-pagar';

/**
 * El reparto por concepto del movimiento: lo pagado a cargos de activo fijo va a «Pago a proveedores de activo fijo»
 * (Inversión) y el resto a «Pago a proveedores» (Operación). Con una sola clase, una sola línea.
 */
export function conceptosDelPago(lineas: readonly LineaRevisada[]): LineaDeConcepto[] {
  const deActivo = lineas
    .filter(({ fila }) => fila.documento.tieneActivoFijo)
    .reduce((suma, { montoCentavos }) => suma + montoCentavos, 0);
  const total = lineas.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0);
  const conceptos: LineaDeConcepto[] = [
    { claveDeSistema: 'pago_a_proveedor', montoCentavos: total - deActivo },
    { claveDeSistema: 'pago_a_proveedor_de_activo', montoCentavos: deActivo },
  ];
  return conceptos.filter(({ montoCentavos }) => montoCentavos > 0);
}

/** Lo que Bancos necesita del pago, ya resuelto. */
export interface DatosParaBancos {
  pagoId: string;
  fecha: string;
  montoCentavos: number;
  beneficiario: string;
  conceptos: LineaDeConcepto[];
}

const conTexto = <C extends string>(clave: C, texto: string | null | undefined): { [K in C]?: string } =>
  (texto ? { [clave]: texto } : {}) as { [K in C]?: string };

/** La orden a Bancos según la forma: emitir el cheque o registrar la nota de débito, con el pago como origen. */
export function ordenarABancos(
  bancos: PagosEnBancos,
  operador: Operador,
  { pedido, datos }: { pedido: PeticionDePago; datos: DatosParaBancos },
): Promise<MovimientoCreado> {
  const { pagoId, ...comunes } = datos;
  const base = {
    ...comunes,
    ...conTexto('referencia', pedido.referencia),
    ...conTexto('observaciones', pedido.observaciones),
    origen: { modulo: MODULO_DE_ORIGEN, documentoId: pagoId },
  };
  if (pedido.forma === 'nota_de_debito') {
    return bancos.registrarNotaDeDebito(operador, { ...base, cuentaBancariaId: pedido.cuentaBancariaId });
  }
  return bancos.emitirCheque(operador, {
    ...base,
    ...conTexto('chequeId', pedido.chequeId),
    chequeraId: pedido.chequeraId,
    noNegociable: pedido.noNegociable ?? true,
  });
}
