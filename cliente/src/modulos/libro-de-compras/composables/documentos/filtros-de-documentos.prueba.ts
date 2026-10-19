import { describe, expect, it } from 'vitest';
import {
  cantidadDeFiltros,
  consultaDeDocumentos,
  etiquetaDePeriodo,
  filtrosIniciales,
  filtrosVacios,
  mesDe,
  opcionesDeDestino,
  opcionesDePeriodo,
  opcionesDeProveedor,
  opcionesDeTipo,
  paginasEnTotal,
  rangoMostrado,
} from './filtros-de-documentos';

const hoy = new Date(2026, 9, 18);

describe('filtros iniciales', () => {
  it('abren en el mes en curso y sin anulados', () => {
    expect(filtrosIniciales(hoy)).toEqual({
      periodo: '2026-10',
      proveedorId: '',
      estado: 'vigente',
      destino: '',
      tipo: '',
    });
  });

  it('mesDe completa el mes con cero', () => {
    expect(mesDe(new Date(2026, 0, 31))).toBe('2026-01');
  });
});

describe('consultaDeDocumentos', () => {
  it('manda el período como el primer día del mes', () => {
    expect(consultaDeDocumentos(filtrosIniciales(hoy), 1)).toMatchObject({
      periodo: '2026-10-01',
      estado: 'vigente',
      pagina: 1,
      limite: 50,
    });
  });

  it('no manda lo que quedó en «todos»', () => {
    const consulta = consultaDeDocumentos(filtrosVacios(), 3);
    expect(consulta).toMatchObject({ pagina: 3 });
    expect([consulta.periodo, consulta.proveedorId, consulta.destino, consulta.tipo]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('manda lo escogido', () => {
    const filtros = {
      periodo: '',
      proveedorId: 'p-1',
      estado: 'todos' as const,
      destino: 'caja-chica' as const,
      tipo: 'recibo' as const,
    };
    expect(consultaDeDocumentos(filtros, 2)).toMatchObject({
      proveedorId: 'p-1',
      estado: 'todos',
      destino: 'caja-chica',
      tipo: 'recibo',
    });
  });
});

describe('cantidadDeFiltros', () => {
  it('no cuenta los vigentes, que es lo de omisión', () => {
    expect(cantidadDeFiltros(filtrosVacios())).toBe(0);
  });

  it('cuenta cada filtro puesto y el estado distinto de vigente', () => {
    expect(cantidadDeFiltros({ ...filtrosIniciales(hoy), estado: 'anulado', tipo: 'factura' })).toBe(3);
  });
});

describe('períodos', () => {
  it('se escriben con el nombre del mes', () => {
    expect(etiquetaDePeriodo('2026-10')).toBe('octubre de 2026');
    expect(etiquetaDePeriodo('2026-01-01')).toBe('enero de 2026');
  });

  it('se ofrecen «todos» y 24 meses, del más reciente al más antiguo, cruzando el año', () => {
    const opciones = opcionesDePeriodo(hoy);
    expect(opciones).toHaveLength(25);
    expect(opciones[0]).toEqual({ valor: '', texto: 'Todos los períodos' });
    expect(opciones[1]).toEqual({ valor: '2026-10', texto: 'Octubre de 2026' });
    expect(opciones[11]?.valor).toBe('2025-12');
    expect(opciones[24]?.valor).toBe('2024-11');
  });

  it('conservan un período más antiguo que ya estaba escogido', () => {
    expect(opcionesDePeriodo(hoy, '2020-05').at(-1)).toEqual({ valor: '2020-05', texto: 'Mayo de 2020' });
  });
});

describe('opciones de las listas', () => {
  it('destino y tipo van por nombre con «todos» primero', () => {
    expect(opcionesDeDestino().map((o) => o.texto)).toEqual([
      'Todos los destinos',
      'Caja chica',
      'Cuentas por liquidar',
      'Cuentas por pagar',
    ]);
    expect(opcionesDeTipo()[0]).toEqual({ valor: '', texto: 'Todos los tipos' });
    expect(opcionesDeTipo()[1]?.texto).toBe('Factura');
  });

  it('proveedores por nombre, sin distinguir mayúsculas ni acentos', () => {
    const opciones = opcionesDeProveedor([
      { id: '2', nombre: 'Zapata' },
      { id: '1', nombre: 'álvarez' },
    ]);
    expect(opciones.map((o) => o.valor)).toEqual(['', '1', '2']);
  });
});

describe('paginación', () => {
  it('calcula las páginas, con una como mínimo', () => {
    expect(paginasEnTotal(0, 50)).toBe(1);
    expect(paginasEnTotal(50, 50)).toBe(1);
    expect(paginasEnTotal(51, 50)).toBe(2);
  });

  it('dice qué filas se ven', () => {
    expect(rangoMostrado(1, 50, 120)).toBe('1 a 50 de 120');
    expect(rangoMostrado(3, 50, 120)).toBe('101 a 120 de 120');
    expect(rangoMostrado(1, 50, 0)).toBe('0 de 0');
  });
});
