import { describe, expect, it } from 'vitest';
import { AVISO_DEL_PAGO_DE_CUENTAS_POR_PAGAR, TEXTO_DE_ANULACION } from './textos-de-baja-de-cheque';

describe('texto de anular un cheque', () => {
  it('avisa que también se anula el pago si el cheque es de Cuentas por pagar', () => {
    expect(TEXTO_DE_ANULACION(5, 'cuentas-por-pagar')).toContain(AVISO_DEL_PAGO_DE_CUENTAS_POR_PAGAR);
  });

  it('no dice nada de eso en un cheque de Bancos', () => {
    expect(TEXTO_DE_ANULACION(5, null)).not.toContain('Cuentas por pagar');
    expect(TEXTO_DE_ANULACION(5)).not.toContain('Cuentas por pagar');
  });
});
