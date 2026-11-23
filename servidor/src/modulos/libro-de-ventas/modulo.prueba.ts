import { describe, expect, it } from 'vitest';
import { RegistroModulos } from '../core/modulos-sistema/registro-modulos.js';
import { definicionesModulos } from '../indice.js';
import { configuracionDeLibroDeVentas } from './configuracion.js';
import { moduloLibroDeVentas } from './modulo.js';

const PREDETERMINADOS: Record<string, unknown> = {
  'libro-de-ventas.ict.tasa_general': 1.5,
  'libro-de-ventas.ict.tasa_exportacion': 2,
  'libro-de-ventas.ict.tasa_margen_bovino': 10,
  'libro-de-ventas.pequeno_contribuyente.limites_anuales': { '2026': 500285 },
  'libro-de-ventas.destino.consumidor_final': 'sin_cartera',
  'libro-de-ventas.anticipos.tratamiento': 'aviso',
};

const definicion = (clave: string) => configuracionDeLibroDeVentas.find((c) => c.clave === clave)!;

describe('módulo de Libro de ventas', () => {
  it('depende de Libro de compras (que trae Terceros) y el registro de módulos lo acepta', () => {
    expect(moduloLibroDeVentas.dependeDe).toEqual(['libro-de-compras']);
    expect(() => new RegistroModulos(definicionesModulos)).not.toThrow();
  });

  it('declara un permiso por acción para los conceptos de ingreso y los documentos, sin gestionar ni soloSuperacceso', () => {
    const permisos = moduloLibroDeVentas.permisos;

    expect(permisos.map((permiso) => permiso.clave)).toEqual([
      'libro-de-ventas.conceptos-de-ingreso.ver',
      'libro-de-ventas.conceptos-de-ingreso.crear',
      'libro-de-ventas.conceptos-de-ingreso.editar',
      'libro-de-ventas.conceptos-de-ingreso.eliminar',
      'libro-de-ventas.conceptos-de-ingreso.importar',
      'libro-de-ventas.conceptos-de-ingreso.exportar',
      'libro-de-ventas.documentos.ver',
      'libro-de-ventas.documentos.crear',
      'libro-de-ventas.documentos.anular',
      'libro-de-ventas.documentos.eliminar',
    ]);
    expect(permisos.some((permiso) => permiso.soloSuperacceso)).toBe(false);
  });
});

describe('configuración de Libro de ventas (§11.3)', () => {
  it('declara las tres tasas del ICT, el límite del pequeño contribuyente, el destino y el tratamiento de anticipos', () => {
    const declaradas = Object.fromEntries(configuracionDeLibroDeVentas.map((c) => [c.clave, c.predeterminado]));

    expect(declaradas).toEqual(PREDETERMINADOS);
  });

  it('solo usa los niveles empresa e instalación que dice el diseño, nunca cuenta', () => {
    expect(definicion('libro-de-ventas.ict.tasa_general').niveles).toEqual(['instalacion']);
    expect(definicion('libro-de-ventas.pequeno_contribuyente.limites_anuales').niveles).toEqual(['instalacion']);
    expect(definicion('libro-de-ventas.destino.consumidor_final').niveles).toEqual(['empresa', 'instalacion']);
    expect(definicion('libro-de-ventas.anticipos.tratamiento').niveles).toEqual(['empresa']);
    for (const variable of configuracionDeLibroDeVentas) expect(variable.niveles).not.toContain('cuenta');
  });

  it('valida las tasas, los años del límite y las opciones', () => {
    expect(definicion('libro-de-ventas.ict.tasa_general').esquema.safeParse(101).success).toBe(false);
    expect(definicion('libro-de-ventas.ict.tasa_general').esquema.safeParse(1.5).success).toBe(true);
    const limites = definicion('libro-de-ventas.pequeno_contribuyente.limites_anuales').esquema;
    expect(limites.safeParse({ '2027': 600000 }).success).toBe(true);
    expect(limites.safeParse({ dosmilveintisiete: 600000 }).success).toBe(false);
    expect(definicion('libro-de-ventas.anticipos.tratamiento').esquema.safeParse('nunca').success).toBe(false);
  });
});
