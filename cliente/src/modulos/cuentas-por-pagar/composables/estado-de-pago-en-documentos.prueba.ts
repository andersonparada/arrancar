import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DocumentoPorPagar, FichaDelDocumento } from '../servicios/tipos';
import { detallesDeFicha, detallesDeLista, detallesDeMontos } from './detalles-de-documento';
import {
  cantidadDeFiltros,
  consultaDeDocumentos,
  filtrosIniciales,
  OPCIONES_DE_ESTADO_DE_PAGO,
} from './filtros-de-documentos';
import { hayAvisoDeConstancia } from './pagos/avisos-del-pago';

beforeEach(() => setActivePinia(createPinia()));

function cargo(cambios: Partial<DocumentoPorPagar> = {}): DocumentoPorPagar {
  return {
    id: 'c1',
    tipo: 'factura',
    clase: 'cargo',
    estado: 'autorizado',
    origen: 'libro_de_compras',
    fechaEmision: '2026-10-01',
    vencimiento: '2026-11-01',
    neto: '1000.00',
    saldo: '400.00',
    pagado: '300.00',
    comprometido: '300.00',
    estadoDePago: 'en_parte',
    ajustado: '0.00',
    reintegrado: '0.00',
    ...cambios,
  } as DocumentoPorPagar;
}

const etiquetas = (detalles: { etiqueta: string }[]): string[] => detalles.map(({ etiqueta }) => etiqueta);

describe('filtro de estado de pago', () => {
  it('no filtra al abrir y lo manda al servidor cuando se escoge', () => {
    expect(consultaDeDocumentos(filtrosIniciales(), 1).estadoDePago).toBeUndefined();
    expect(cantidadDeFiltros(filtrosIniciales())).toBe(0);
    const filtros = { ...filtrosIniciales(), estadoDePago: 'comprometido' as const };
    expect(consultaDeDocumentos(filtros, 1).estadoDePago).toBe('comprometido');
    expect(cantidadDeFiltros(filtros)).toBe(1);
  });

  it('ofrece los cuatro estados, con el comprometido explicado', () => {
    const valores = OPCIONES_DE_ESTADO_DE_PAGO.map(({ valor }) => valor);
    expect(valores).toEqual(['', 'comprometido', 'pagado', 'en_parte', 'pendiente']);
    expect(OPCIONES_DE_ESTADO_DE_PAGO[1]?.texto).toMatch(/posfechado/);
  });
});

describe('lo pagado en la lista y la ficha', () => {
  it('un cargo muestra lo pagado y, si lo hay, lo comprometido', () => {
    expect(etiquetas(detallesDeLista(cargo()))).toEqual([
      'Emisión',
      'Vence',
      'Neto a pagar',
      'Pagado',
      'Comprometido',
      'Saldo',
    ]);
    expect(etiquetas(detallesDeLista(cargo({ comprometido: '0.00' })))).not.toContain('Comprometido');
  });

  it('una nota de crédito y un documento anulado no muestran pagos', () => {
    expect(etiquetas(detallesDeLista(cargo({ clase: 'abono' })))).not.toContain('Pagado');
    expect(etiquetas(detallesDeLista(cargo({ estado: 'anulado' })))).not.toContain('Pagado');
  });

  it('la ficha del cargo dice el estado de pago y la de la nota, lo reintegrado', () => {
    const ficha = cargo() as FichaDelDocumento;
    expect(detallesDeFicha(ficha)).toContainEqual({ etiqueta: 'Estado de pago', valor: 'Pagada en parte' });
    expect(etiquetas(detallesDeMontos(ficha))).toContain('Pagado');
    const nota = cargo({ clase: 'abono', estadoDePago: null }) as FichaDelDocumento;
    expect(etiquetas(detallesDeMontos(nota))).toContain('Reintegrado por el proveedor');
    expect(etiquetas(detallesDeFicha(nota))).not.toContain('Estado de pago');
  });
});

describe('enlace a las constancias pendientes', () => {
  it('se ofrece solo si algún aviso habla de una constancia', () => {
    expect(hayAvisoDeConstancia(['La retención de la factura A-1 no tiene constancia registrada: emítala.'])).toBe(
      true,
    );
    expect(hayAvisoDeConstancia(['Bancarización (Decreto 20-2006).'])).toBe(false);
    expect(hayAvisoDeConstancia([])).toBe(false);
  });
});
