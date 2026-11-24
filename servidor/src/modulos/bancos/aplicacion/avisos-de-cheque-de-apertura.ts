import type { AvisoDeBancos } from '../../core/contratos/bancos.contratos.js';
import { fechaLegible } from '../dominio/errores-de-apertura.js';

export const CODIGO_BENEFICIARIO_DISTINTO = 'beneficiario_distinto';
export const CODIGO_POSFECHADO_COBRADO_PRONTO = 'posfechado_cobrado_pronto';

/** El cheque está a nombre de alguien distinto del proveedor del pago: lo normal es un error de captura. */
export function avisoDeBeneficiarioDistinto(beneficiario: string | null, esperado: string): AvisoDeBancos {
  return {
    codigo: CODIGO_BENEFICIARIO_DISTINTO,
    mensaje: `El cheque está a nombre de «${beneficiario ?? 'sin beneficiario'}» y el proveedor es «${esperado}». Revise que sea el cheque correcto.`,
  };
}

/**
 * El posfechado quedó marcado en la primera conciliación de su cuenta (contador, 19/11/2026): si el banco lo cobró en o
 * antes del corte, la factura ya estaba pagada y no debía ir en el saldo inicial. `corte` es `null` si la empresa aún
 * no tiene fecha de inicio.
 */
export function avisoDePosfechadoCobradoPronto(corte: string | null): AvisoDeBancos {
  const fecha = corte ? ` (${fechaLegible(corte)})` : '';
  return {
    codigo: CODIGO_POSFECHADO_COBRADO_PRONTO,
    mensaje:
      'El banco cobró este cheque posfechado en el primer período conciliado. ' +
      `Si lo cobró en o antes del corte${fecha}, la factura ya estaba pagada y no debía ir en el saldo inicial de ` +
      'Cuentas por pagar: corríjalo con la carga abierta. Si lo cobró después, está bien.',
  };
}
