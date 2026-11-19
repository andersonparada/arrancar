import { describe, expect, it } from 'vitest';
import type { AjustesDelAviso } from '../../servicios/tipos-de-avisos-de-pago';
import { ajustesParaGuardar, borradorDeAjustes, hayCambiosEnLosAjustes, marcadoresEnTexto } from './ajustes-del-aviso';

const guardado: AjustesDelAviso = {
  envio: 'manual',
  asunto: 'Pago {numero}',
  mensaje: 'Gracias.',
  adjuntarComprobante: true,
  copiaALaEmpresa: true,
};

describe('ajustes del aviso de pago', () => {
  it('el borrador es una copia: editarlo no cambia lo guardado', () => {
    const borrador = borradorDeAjustes(guardado);
    borrador.envio = 'automatico';
    expect(guardado.envio).toBe('manual');
  });

  it('no hay cambios si solo se tocaron espacios de los extremos', () => {
    expect(hayCambiosEnLosAjustes({ ...guardado, asunto: '  Pago {numero} ' }, guardado)).toBe(false);
  });

  it('hay cambios si cambia el envío o un texto', () => {
    expect(hayCambiosEnLosAjustes({ ...guardado, envio: 'automatico' }, guardado)).toBe(true);
    expect(hayCambiosEnLosAjustes({ ...guardado, mensaje: 'Hola.' }, guardado)).toBe(true);
  });

  it('al guardar se recortan los textos', () => {
    expect(ajustesParaGuardar({ ...guardado, asunto: '  Pago  ' }).asunto).toBe('Pago');
  });

  it('los marcadores se muestran entre llaves', () => {
    expect(marcadoresEnTexto(['numero', 'monto'])).toBe('{numero}, {monto}');
  });
});
