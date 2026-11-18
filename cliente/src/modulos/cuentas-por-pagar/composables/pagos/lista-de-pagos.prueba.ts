import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { resumenDeEjemplo } from './ejemplos-de-ficha-de-pago';
import {
  cantidadDeFiltrosDePagos,
  consultaDePagos,
  detallesDeLaFila,
  filtrosInicialesDePagos,
  formaDeLaFila,
  marcaDeLaFila,
  OPCIONES_DE_FORMA,
} from './lista-de-pagos';

// Los formatos de fecha y monto leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

describe('lista de pagos', () => {
  it('al abrir pide los vigentes y no manda filtros vacíos', () => {
    const consulta = consultaDePagos(filtrosInicialesDePagos(), 1);
    expect(consulta).toMatchObject({ estado: 'vigente', pagina: 1 });
    expect(consulta.proveedorId).toBeUndefined();
    expect(consulta.posfechado).toBeUndefined();
    expect(cantidadDeFiltrosDePagos(filtrosInicialesDePagos())).toBe(0);
  });

  it('«solo posfechados» manda posfechado=true y cuenta como filtro', () => {
    const filtros = { ...filtrosInicialesDePagos(), posfechado: 'si' as const, estado: 'todos' as const };
    expect(consultaDePagos(filtros, 2)).toMatchObject({ posfechado: true, estado: 'todos', pagina: 2 });
    expect(cantidadDeFiltrosDePagos(filtros)).toBe(2);
  });

  it('las formas van ordenadas por nombre después de «todas»', () => {
    const textos = OPCIONES_DE_FORMA.slice(1).map(({ texto }) => texto);
    expect(OPCIONES_DE_FORMA[0]?.valor).toBe('');
    expect(textos).toEqual([...textos].sort((a, b) => a.localeCompare(b, 'es')));
  });

  it('lee la forma con su documento y cuenta, o con el retiro en efectivo', () => {
    expect(formaDeLaFila(resumenDeEjemplo())).toBe('Cheque 1523 · Banco X');
    expect(formaDeLaFila(resumenDeEjemplo({ forma: 'cuenta_de_apertura', movimiento: null }))).toBe(
      'Cuenta de apertura',
    );
    const efectivo = resumenDeEjemplo({
      forma: 'efectivo',
      movimiento: null,
      retiro: { id: 'r1', numero: '15', custodio: 'Luis' },
    });
    expect(formaDeLaFila(efectivo)).toBe('Efectivo · Retiro 15');
  });

  it('la marca: anulado manda sobre posfechado', () => {
    expect(marcaDeLaFila(resumenDeEjemplo())).toBeUndefined();
    expect(marcaDeLaFila(resumenDeEjemplo({ posfechado: true }))).toBe('Posfechado');
    expect(marcaDeLaFila(resumenDeEjemplo({ posfechado: true, estado: 'anulado' }))).toBe('Anulado');
  });

  it('las contraseñas salen en singular o plural y la anulación solo si la hay', () => {
    const una = detallesDeLaFila(resumenDeEjemplo()).map(({ etiqueta }) => etiqueta);
    expect(una).toContain('Contraseña');
    expect(una).not.toContain('Anulado el');
    const varias = detallesDeLaFila(
      resumenDeEjemplo({
        contrasenas: [
          { id: 'c1', numero: '15' },
          { id: 'c2', numero: '16' },
        ],
        estado: 'anulado',
        fechaDeAnulacion: '2026-11-12',
      }),
    );
    expect(varias.find(({ etiqueta }) => etiqueta === 'Contraseñas')?.valor).toBe('15, 16');
    expect(varias.map(({ etiqueta }) => etiqueta)).toContain('Anulado el');
  });
});
