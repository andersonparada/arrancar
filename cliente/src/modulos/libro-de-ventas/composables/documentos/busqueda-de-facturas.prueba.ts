import { describe, expect, it } from 'vitest';
import { consultaDeFacturas, FACTURAS_POR_BUSQUEDA, resultadoDeFacturas, sinResultados } from './busqueda-de-facturas';
import { documentoEnLista } from './documentos.soporte';

describe('consulta de las facturas que corrige una nota', () => {
  it('con cliente pide las suyas; sin cliente, las de consumidor final', () => {
    expect(consultaDeFacturas('c1', '')).toEqual({ estado: 'vigente', limite: FACTURAS_POR_BUSQUEDA, clienteId: 'c1' });
    expect(consultaDeFacturas(null, '')).toEqual({
      estado: 'vigente',
      limite: FACTURAS_POR_BUSQUEDA,
      sinCliente: true,
    });
  });

  it('el texto se recorta y solo se manda si hay algo', () => {
    expect(consultaDeFacturas(null, '  A-12 ').texto).toBe('A-12');
    expect(consultaDeFacturas(null, '   ')).not.toHaveProperty('texto');
  });
});

describe('resultado de la búsqueda', () => {
  const pagina = (total: number) => ({
    elementos: [documentoEnLista({ id: 'f1' }), documentoEnLista({ id: 'n1', tipo: 'nota_de_credito' })],
    total,
    pagina: 1,
    limite: 50,
  });

  it('quita las notas y avisa si hay más de los que se muestran', () => {
    const resultado = resultadoDeFacturas(pagina(80), { id: null, anteriores: [] });

    expect(resultado.elementos.map((f) => f.id)).toEqual(['f1']);
    expect(resultado.hayMas).toBe(true);
    expect(resultadoDeFacturas(pagina(2), { id: null, anteriores: [] }).hayMas).toBe(false);
  });

  it('conserva la factura ya elegida aunque no salga en esta búsqueda', () => {
    const elegida = documentoEnLista({ id: 'vieja' });

    const resultado = resultadoDeFacturas(pagina(2), { id: 'vieja', anteriores: [elegida] });

    expect(resultado.elementos.map((f) => f.id)).toEqual(['vieja', 'f1']);
  });
});

describe('mensaje sin resultados', () => {
  it('distingue la búsqueda, el cliente y consumidor final', () => {
    expect(sinResultados('c1', 'A-9')).toContain('coincide');
    expect(sinResultados('c1', '')).toContain('Este cliente');
    expect(sinResultados(null, '')).toContain('consumidor final');
  });
});
