import { describe, expect, it } from 'vitest';
import { RegistroModulos } from '../core/modulos-sistema/registro-modulos.js';
import { configuracionDeActivosFijos } from './configuracion.js';
import { INCISOS_CON_TOPE } from './dominio/incisos-fiscales.js';
import { moduloActivosFijos } from './modulo.js';

const PREDETERMINADOS: Record<string, number | string> = {
  'activos-fijos.isr.maximo.edificios': 5,
  'activos-fijos.isr.maximo.plantaciones': 15,
  'activos-fijos.isr.maximo.instalaciones_y_mobiliario': 20,
  'activos-fijos.isr.maximo.maquinaria_y_vehiculos': 20,
  'activos-fijos.isr.maximo.computo': 33.33,
  'activos-fijos.isr.maximo.herramientas': 25,
  'activos-fijos.isr.maximo.reproductores': 25,
  'activos-fijos.isr.maximo.otros_muebles': 10,
  'activos-fijos.isr.maximo.intangibles': 20,
  'activos-fijos.isr.maximo.llave': 10,
  'activos-fijos.depreciacion.primer_mes': 'mes_de_inicio',
  'activos-fijos.capitalizacion.umbral': 0,
  'activos-fijos.codigos.prefijo': 'AF-',
  'activos-fijos.construccion.meses_de_aviso': 12,
  'activos-fijos.documentos.nombre_de_responsiva': 'Responsiva de bienes',
};

const definicion = (clave: string) => configuracionDeActivosFijos.find((c) => c.clave === clave)!;

describe('configuración de activos fijos (§10.4)', () => {
  it('declara los diez topes de ley y las cuatro variables del módulo con sus valores por omisión', () => {
    const declaradas = Object.fromEntries(configuracionDeActivosFijos.map((c) => [c.clave, c.predeterminado]));

    expect(declaradas).toEqual(PREDETERMINADOS);
    expect(INCISOS_CON_TOPE).toHaveLength(10);
  });

  it('los topes son solo de instalación (la ley es igual para todas) y no son públicos', () => {
    for (const clave of Object.keys(PREDETERMINADOS).filter((c) => c.includes('.isr.maximo.'))) {
      expect(definicion(clave).niveles).toEqual(['instalacion']);
      expect(definicion(clave).publica).toBe(false);
    }
  });

  it('las demás variables van en los niveles empresa e instalación que dice el diseño, sin cuenta', () => {
    expect(definicion('activos-fijos.depreciacion.primer_mes').niveles).toEqual(['empresa', 'instalacion']);
    expect(definicion('activos-fijos.capitalizacion.umbral').niveles).toEqual(['empresa']);
    expect(definicion('activos-fijos.codigos.prefijo').niveles).toEqual(['empresa']);
    expect(definicion('activos-fijos.construccion.meses_de_aviso').niveles).toEqual(['empresa', 'instalacion']);
    for (const variable of configuracionDeActivosFijos) expect(variable.niveles).not.toContain('cuenta');
  });

  it('el prefijo del código y el título de la responsiva llegan al cliente', () => {
    const publicas = configuracionDeActivosFijos.filter((c) => c.publica).map((c) => c.clave);

    expect(publicas).toEqual(['activos-fijos.codigos.prefijo', 'activos-fijos.documentos.nombre_de_responsiva']);
    expect(definicion('activos-fijos.documentos.nombre_de_responsiva').niveles).toEqual(['empresa']);
  });

  it('el valor por omisión de cada una pasa su esquema', () => {
    for (const variable of configuracionDeActivosFijos)
      expect(variable.esquema.safeParse(variable.predeterminado).success).toBe(true);
  });

  it('el primer mes solo acepta mes_de_inicio o mes_siguiente; el umbral no es negativo; los meses de aviso, enteros', () => {
    const primerMes = definicion('activos-fijos.depreciacion.primer_mes').esquema;
    const umbral = definicion('activos-fijos.capitalizacion.umbral').esquema;
    const aviso = definicion('activos-fijos.construccion.meses_de_aviso').esquema;

    expect(['mes_de_inicio', 'mes_siguiente'].map((v) => primerMes.safeParse(v).success)).toEqual([true, true]);
    expect(primerMes.safeParse('por_dias').success).toBe(false);
    expect([0, 1500.5].map((v) => umbral.safeParse(v).success)).toEqual([true, true]);
    expect([-1, 10.005].map((v) => umbral.safeParse(v).success)).toEqual([false, false]);
    expect([0, 2.5].map((v) => aviso.safeParse(v).success)).toEqual([false, false]);
  });

  it('un tope acepta centésimas y rechaza lo que pasa de 100 o tiene más decimales', () => {
    const tope = definicion('activos-fijos.isr.maximo.computo').esquema;

    expect([33.33, 100, 0].map((v) => tope.safeParse(v).success)).toEqual([true, true, true]);
    expect([100.01, -1, 33.333].map((v) => tope.safeParse(v).success)).toEqual([false, false, false]);
  });

  it('el módulo depende del libro de compras y el registro las encuentra por clave', () => {
    const registro = new RegistroModulos([
      moduloActivosFijos,
      { clave: 'libro-de-compras', nombre: 'L', descripcion: '', permisos: [] },
    ]);

    expect(moduloActivosFijos.dependeDe).toEqual(['libro-de-compras']);
    expect(registro.configuracionesDe(['activos-fijos'])).toHaveLength(15);
    expect(registro.definicionConfiguracion('activos-fijos.isr.maximo.edificios')?.predeterminado).toBe(5);
  });
});
