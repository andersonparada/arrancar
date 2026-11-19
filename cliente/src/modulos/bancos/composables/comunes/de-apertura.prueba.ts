import { describe, expect, it } from 'vitest';
import { textoDeAnulacionEnLoteDeApertura } from '../../textos-de-apertura';
import { detalleDeApertura, esDeApertura, INSIGNIA_DE_APERTURA, textoDeAnulacionDeApertura } from './de-apertura';

describe('partidas de la carga inicial', () => {
  it('es de la carga inicial solo si el servidor manda su parte', () => {
    expect(esDeApertura({ parteDeApertura: 'cheque_en_circulacion' })).toBe(true);
    expect(esDeApertura({ parteDeApertura: null })).toBe(false);
    expect(detalleDeApertura({ parteDeApertura: 'error_del_banco' })).toEqual({
      etiqueta: 'Origen',
      valor: INSIGNIA_DE_APERTURA,
    });
    expect(detalleDeApertura({ parteDeApertura: null })).toBeNull();
  });

  it('anular un cheque usa el texto del dictamen con la fecha de corte', () => {
    const texto = textoDeAnulacionDeApertura('cheque_en_circulacion', '31/12/2026');
    expect(texto).toContain('después del 31/12/2026');
    expect(texto).toContain('Código de Comercio, arts. 408 y 410');
    expect(textoDeAnulacionDeApertura('cheque_posfechado', '31/12/2026')).toBe(texto);
  });

  it('anular un depósito en tránsito explica el débito y que la comisión es aparte', () => {
    expect(textoDeAnulacionDeApertura('deposito_en_transito', '31/12/2026')).toContain('un débito');
  });

  it('otras partidas usan el texto general', () => {
    expect(textoDeAnulacionDeApertura('error_del_banco', '31/12/2026')).toContain('movimiento inverso');
    expect(textoDeAnulacionDeApertura(null, '31/12/2026')).toContain('movimiento inverso');
  });

  it('sin la fecha de corte nombra el corte en vez de dejar un hueco', () => {
    const texto = textoDeAnulacionDeApertura('cheque_en_circulacion', null);
    expect(texto).toContain('después del corte de la carga inicial');
    expect(texto).not.toContain('null');
  });

  it('la anulación en lote cuenta los cheques de la carga inicial', () => {
    expect(textoDeAnulacionEnLoteDeApertura(1, '31/12/2026')).toContain('1 de los cheques es de la carga inicial');
    expect(textoDeAnulacionEnLoteDeApertura(3, null)).toContain('3 de los cheques son de la carga inicial');
  });
});
