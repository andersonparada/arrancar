import { describe, expect, it } from 'vitest';
import { filaDte, propuesta } from './bandeja.soporte';
import { datosDeLaFilaPendiente, insigniasDeLaFila, notaDeLaFila, textoDeLoQueFalta } from './detalles-de-la-fila';

const formato = (fecha: string) => `fecha ${fecha}`;

describe('detalles de una fila de la bandeja', () => {
  it('muestra lo propuesto con el nombre del concepto y el destino', () => {
    const datos = datosDeLaFilaPendiente(filaDte(), new Map([['c1', 'Ferretería']]), formato);
    expect(datos).toEqual([
      { etiqueta: 'Concepto', valor: 'Ferretería' },
      { etiqueta: 'Destino', valor: 'Cuentas por pagar' },
      { etiqueta: 'Recepción', valor: 'fecha 2026-10-12' },
      { etiqueta: 'Período', valor: '2026-10' },
    ]);
  });

  it('lo que falta se muestra como «Sin elegir»', () => {
    const datos = datosDeLaFilaPendiente(filaDte({ propuesta: null }), new Map(), formato);
    expect(datos.every(({ valor }) => valor === 'Sin elegir')).toBe(true);
  });

  it('un concepto que ya no está en el catálogo tampoco rompe la fila', () => {
    expect(datosDeLaFilaPendiente(filaDte(), new Map(), formato)[0]?.valor).toBe('Sin elegir');
  });

  it('avisa de lo importante con etiquetas', () => {
    expect(insigniasDeLaFila(filaDte())).toEqual([]);
    const anulada = filaDte({ estadoSat: 'anulado', propuesta: propuesta({ proveedorId: null }) });
    expect(insigniasDeLaFila(anulada).map(({ texto }) => texto)).toEqual(['Anulado en la SAT', 'Proveedor nuevo']);
    expect(insigniasDeLaFila(filaDte({ estado: 'registrado' })).map(({ texto }) => texto)).toEqual(['Registrado']);
  });

  it('dice qué falta para confirmar, o nada si no falta nada', () => {
    expect(textoDeLoQueFalta(filaDte())).toBe('');
    expect(textoDeLoQueFalta(filaDte({ propuesta: null }))).toBe(
      'Falta el concepto de gasto, el destino, la fecha de recepción.',
    );
  });

  it('explica por qué una fila está bloqueada o descartada', () => {
    const bloqueada = filaDte({ estado: 'bloqueado', motivoDeBloqueo: 'registrado_en_otra_empresa' });
    expect(notaDeLaFila(bloqueada)).toBe('Ya está registrado en otra empresa de su cuenta.');
    expect(notaDeLaFila(filaDte({ estado: 'descartado', motivoDeDescarte: 'Duplicado' }))).toBe('Motivo: Duplicado');
    expect(notaDeLaFila(filaDte())).toBe('');
  });
});
