import { describe, expect, it } from 'vitest';
import {
  cantidadDeFiltros,
  consultaDeDocumentos,
  etiquetaDePeriodo,
  filtrosIniciales,
  filtrosVacios,
  mesDe,
  opcionesDeCliente,
  opcionesDeDestino,
  opcionesDePeriodo,
  paginasEnTotal,
  rangoMostrado,
} from './filtros-de-documentos';

const hoy = new Date(2026, 10, 23);

describe('filtros de la lista de ventas', () => {
  it('al abrir muestra el mes en curso y los vigentes', () => {
    expect(filtrosIniciales(hoy)).toMatchObject({ periodo: '2026-11', estado: 'vigente', clienteId: '' });
    expect(mesDe(new Date(2026, 0, 5))).toBe('2026-01');
  });

  it('manda el período como primer día del mes y omite lo que quedó en «todos»', () => {
    const consulta = consultaDeDocumentos({ ...filtrosIniciales(hoy), texto: '  A-12 ' }, 2);

    expect(consulta).toEqual({
      periodo: '2026-11-01',
      clienteId: undefined,
      estado: 'vigente',
      destino: undefined,
      tipo: undefined,
      texto: 'A-12',
      pagina: 2,
      limite: 50,
    });
    expect(consultaDeDocumentos(filtrosVacios(), 1).periodo).toBeUndefined();
  });

  it('cuenta los filtros puestos; vigentes no cuenta', () => {
    expect(cantidadDeFiltros(filtrosVacios())).toBe(0);
    expect(cantidadDeFiltros({ ...filtrosVacios(), estado: 'todos', texto: 'x', tipo: 'factura' })).toBe(3);
  });

  it('ofrece 24 meses más «todos» y conserva un período antiguo ya escogido', () => {
    const opciones = opcionesDePeriodo(hoy);
    expect(opciones).toHaveLength(25);
    expect(opciones[1]).toEqual({ valor: '2026-11', texto: 'Noviembre de 2026' });
    expect(opcionesDePeriodo(hoy, '2020-03').at(-1)?.valor).toBe('2020-03');
    expect(etiquetaDePeriodo('2026-02-01')).toBe('febrero de 2026');
  });

  it('los clientes van por nombre después de «Todos»', () => {
    const opciones = opcionesDeCliente([
      { id: '2', nombre: 'Zacarías', nit: null, activo: true },
      { id: '1', nombre: 'álvaro', nit: null, activo: false },
    ]);

    expect(opciones.map((o) => o.texto)).toEqual(['Todos los clientes', 'álvaro', 'Zacarías']);
  });

  it('los destinos incluyen «Sin cartera»', () => {
    expect(opcionesDeDestino().map((o) => o.valor)).toContain('ninguno');
  });

  it('calcula páginas y el rango mostrado', () => {
    expect(paginasEnTotal(0, 50)).toBe(1);
    expect(paginasEnTotal(101, 50)).toBe(3);
    expect(rangoMostrado(2, 50, 120)).toBe('51 a 100 de 120');
    expect(rangoMostrado(1, 50, 0)).toBe('0 de 0');
  });
});
