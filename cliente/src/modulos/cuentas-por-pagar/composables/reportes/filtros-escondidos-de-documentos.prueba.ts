import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { resumenDeFiltrosEscondidos } from './filtros-escondidos-de-documentos';
import { aplicarVista, filtrosDeDocumentosVacios } from './vistas-de-documentos';

beforeEach(() => setActivePinia(createPinia()));

describe('resumen de los filtros de «Más filtros»', () => {
  it('queda vacío si no se filtra por nada ahí', () => {
    expect(resumenDeFiltrosEscondidos(filtrosDeDocumentosVacios('2026-11-18'))).toEqual([]);
  });

  it('dice lo que pone la vista «Estado de pago»', () => {
    const filtros = aplicarVista(filtrosDeDocumentosVacios('2026-11-18'), 'estado_de_pago', '2026-11-18');

    expect(resumenDeFiltrosEscondidos(filtros)).toEqual([
      'Estado de pago: Pendiente',
      expect.stringContaining('Emitidos desde'),
      expect.stringContaining('Emitidos hasta'),
    ]);
  });
});
