import { describe, expect, it } from 'vitest';
import { dibujarEncabezadoDeLaTabla, dibujarFilasDeLaHoja } from '../../../core/impresion/pdf/tabla-del-pdf.js';
import type { Caja, Estilo, PincelDelPdf } from '../../../core/impresion/pdf/pincel-del-pdf.js';
import type { PaginaConSubtotales } from '../../../core/impresion/pdf/paginacion-con-subtotales.js';
import { COLUMNAS_DE_DINERO, type FilaDelLibro, type MontosDelLibro } from '../../dominio/libro/fila-del-libro.js';
import { columnasDeLaTabla } from './columnas-de-la-tabla.js';

interface Trazo {
  tipo: 'texto' | 'titulo' | 'linea';
  texto?: string;
  x: number;
  y: number;
  estilo?: Estilo;
}

/** Un pincel que solo anota lo que se le pide dibujar. */
function pincelDoble(): { pincel: PincelDelPdf; trazos: Trazo[] } {
  const trazos: Trazo[] = [];
  const pincel = {
    texto: (texto: string, caja: Caja, estilo: Estilo) =>
      trazos.push({ tipo: 'texto', texto, x: caja.x, y: caja.y, estilo }),
    titulo: (texto: string, caja: Caja) => trazos.push({ tipo: 'titulo', texto, x: caja.x, y: caja.y }),
    linea: (desde: { x: number; y: number }) => trazos.push({ tipo: 'linea', x: desde.x, y: desde.y }),
  } as unknown as PincelDelPdf;
  return { pincel, trazos };
}

const montosEnCero = () => Object.fromEntries(COLUMNAS_DE_DINERO.map((c) => [c, 0])) as unknown as MontosDelLibro;

function fila(): FilaDelLibro {
  return {
    ...montosEnCero(),
    documentoId: 'd1',
    proveedorId: 'p',
    numeroDeFila: 1,
    fecha: '2026-10-01',
    tipoDte: 'FACT',
    serie: 'A',
    numero: '7',
    nit: '1234567',
    nombre: 'Proveedor',
    motivo: null,
    siglaDelMotivo: null,
    bienes: 100000,
    ivaConCredito: 12000,
    total: 112000,
  } as FilaDelLibro;
}

function pagina(parte: Partial<PaginaConSubtotales<FilaDelLibro, MontosDelLibro>>) {
  const acumulado = { ...montosEnCero(), total: 112000 } as MontosDelLibro;
  return { numero: 1, filas: [fila()], vienen: null, acumulado, esUltima: true, ...parte };
}

const tipos = ['completo', 'simplificado'] as const;

describe('tabla del libro en el PDF', () => {
  it.each(tipos)('el encabezado lleva los títulos de las columnas del libro %s y una línea', (tipo) => {
    const columnas = columnasDeLaTabla(tipo);
    const { pincel, trazos } = pincelDoble();

    dibujarEncabezadoDeLaTabla(pincel, columnas);

    expect(trazos.filter((t) => t.tipo === 'titulo').map((t) => t.texto)).toEqual(columnas.map((c) => c.titulo));
    expect(trazos.filter((t) => t.tipo === 'linea')).toEqual([{ tipo: 'linea', x: 30, y: 122 }]);
  });

  it.each(tipos)('una fila omite los montos en cero y dibuja los demás a la derecha (%s)', (tipo) => {
    const { pincel, trazos } = pincelDoble();

    dibujarFilasDeLaHoja(pincel, columnasDeLaTabla(tipo), pagina({}));

    const deLaFila = trazos.filter((t) => t.tipo === 'texto' && t.y === 136);
    const montos = deLaFila.filter((t) => t.estilo?.numero);
    expect(montos.length).toBeGreaterThan(0);
    expect(montos.every((t) => t.texto !== '0.00' && t.estilo?.alinear === 'right')).toBe(true);
    expect(deLaFila.map((t) => t.texto)).toContain('Proveedor');
    expect(trazos.filter((t) => t.tipo === 'linea' && t.y === 136 + 12 - 1.5)).toHaveLength(1);
  });

  it('la primera hoja no lleva «Vienen» y la última cierra con el total del período en la línea 34', () => {
    const { pincel, trazos } = pincelDoble();

    dibujarFilasDeLaHoja(pincel, columnasDeLaTabla('completo'), pagina({}));

    const textos = trazos.map((t) => t.texto);
    expect(textos).not.toContain('Vienen');
    const total = trazos.find((t) => t.texto === 'Total del período');
    expect(total).toMatchObject({ y: 124 + 12 * 34, estilo: { negrita: true, alinear: 'right' } });
  });

  it('una hoja intermedia lleva «Vienen» arriba y «Van» abajo, con los subtotales y ceros visibles', () => {
    const vienen = { ...montosEnCero(), total: 500 } as MontosDelLibro;
    const { pincel, trazos } = pincelDoble();

    dibujarFilasDeLaHoja(pincel, columnasDeLaTabla('completo'), pagina({ vienen, esUltima: false }));

    expect(trazos.find((t) => t.texto === 'Vienen')?.y).toBe(124);
    expect(trazos.find((t) => t.texto === 'Van')?.y).toBe(124 + 12 * 34);
    const subtotales = trazos.filter((t) => t.estilo?.negrita && t.estilo.numero);
    expect(subtotales.some((t) => t.texto === '5.00')).toBe(true);
    expect(subtotales.some((t) => t.texto === '1,120.00' || t.texto === '1120.00')).toBe(true);
    expect(subtotales.some((t) => t.texto === '0.00')).toBe(true);
  });
});
