import { describe, expect, it } from 'vitest';
import {
  AYUDA_DEL_POSFECHADO,
  ayudaDelGrupo,
  textoDeAnulacionDeCheque,
  textoDeChequeAntiguo,
  textoDeChequesEntregados,
} from './textos-de-apertura';

// Los textos de ley salen del dictamen de contador-guatemala (2026-11-18, «Texto para la app»).
describe('textos con artículos de ley', () => {
  it('cheque antiguo: art. 508, «ya no está obligado», no «puede negarse»', () => {
    const texto = textoDeChequeAntiguo({ numero: 7, fecha: '01/03/2026', corte: '31/12/2026', meses: 9 });
    expect(texto).toBe(
      'El cheque 7 es del 01/03/2026: al 31/12/2026 tiene 9 meses. Pasados 6 meses de su fecha, el banco ya no está obligado a pagarlo (Código de Comercio, art. 508). Revise si sigue en circulación o si conviene anularlo y reponerlo.',
    );
  });

  it('anular un cheque: arts. 408 y 410, la deuda sigue, y no dice que «revive»', () => {
    const texto = textoDeAnulacionDeCheque('31/12/2026');
    expect(texto).toContain('Código de Comercio, arts. 408 y 410');
    expect(texto).toContain('Cuentas por pagar');
    expect(texto).not.toMatch(/reviv/i);
  });

  it('posfechado: art. 501, el banco puede pagarlo antes de su fecha', () => {
    expect(AYUDA_DEL_POSFECHADO).toContain('Código de Comercio, art. 501');
  });

  it('solo cheques entregados', () => {
    expect(textoDeChequesEntregados('31/12/2026')).toContain('entregados');
    expect(textoDeChequesEntregados('31/12/2026')).toContain('no lo cargue');
  });

  it('cada grupo de partidas tiene su ayuda', () => {
    for (const parte of [
      'cheque_en_circulacion',
      'deposito_en_transito',
      'debito_en_transito',
      'error_del_banco',
      'cheque_posfechado',
    ]) {
      expect(ayudaDelGrupo(parte, '31/12/2026').length).toBeGreaterThan(10);
    }
  });
});
