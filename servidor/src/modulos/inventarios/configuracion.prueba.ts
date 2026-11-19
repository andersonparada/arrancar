import { describe, expect, it } from 'vitest';
import { RegistroModulos } from '../core/modulos-sistema/registro-modulos.js';
import { configuracionDeInventarios } from './configuracion.js';
import { moduloInventarios } from './modulo.js';

const PREDETERMINADOS: Record<string, boolean | number | string> = {
  'inventarios.costeo.metodo_inicial': 'promedio_ponderado',
  'inventarios.traslados.con_transito': false,
  'inventarios.ajustes.requiere_aprobacion': true,
  'inventarios.ajustes.aprobar_lo_propio': false,
  'inventarios.ajustes.destino_del_sobrante': 'otros_ingresos',
  'inventarios.conteos.bloquear_bodega': true,
  'inventarios.vencimientos.dias_de_aviso': 30,
  'inventarios.codigos.prefijo': 'ART-',
};

const definicion = (clave: string) => configuracionDeInventarios.find((c) => c.clave === clave)!;

describe('configuración de inventarios (§10.4)', () => {
  it('declara las ocho variables del diseño con sus valores por omisión', () => {
    const declaradas = Object.fromEntries(configuracionDeInventarios.map((c) => [c.clave, c.predeterminado]));

    expect(declaradas).toEqual(PREDETERMINADOS);
  });

  it('solo va en los niveles empresa e instalación, nunca en cuenta', () => {
    expect(definicion('inventarios.costeo.metodo_inicial').niveles).toEqual(['empresa', 'instalacion']);
    expect(definicion('inventarios.vencimientos.dias_de_aviso').niveles).toEqual(['empresa', 'instalacion']);
    expect(definicion('inventarios.traslados.con_transito').niveles).toEqual(['empresa']);
    for (const variable of configuracionDeInventarios) expect(variable.niveles).not.toContain('cuenta');
  });

  it('solo el prefijo del código llega al formulario del cliente', () => {
    const publicas = configuracionDeInventarios.filter((c) => c.publica).map((c) => c.clave);

    expect(publicas).toEqual(['inventarios.codigos.prefijo']);
  });

  it('valida los valores de cada variable', () => {
    expect(definicion('inventarios.costeo.metodo_inicial').esquema.safeParse('ueps').success).toBe(false);
    expect(definicion('inventarios.costeo.metodo_inicial').esquema.safeParse('peps').success).toBe(true);
    expect(definicion('inventarios.vencimientos.dias_de_aviso').esquema.safeParse(0).success).toBe(false);
    expect(definicion('inventarios.codigos.prefijo').esquema.safeParse('x'.repeat(11)).success).toBe(false);
  });

  it('el valor por omisión de cada una pasa su esquema', () => {
    for (const variable of configuracionDeInventarios)
      expect(variable.esquema.safeParse(variable.predeterminado).success).toBe(true);
  });

  it('el módulo depende del libro de compras y el registro encuentra sus variables por clave', () => {
    const registro = new RegistroModulos([
      moduloInventarios,
      { clave: 'libro-de-compras', nombre: 'L', descripcion: '', permisos: [] },
    ]);

    expect(moduloInventarios.dependeDe).toEqual(['libro-de-compras']);
    expect(registro.configuracionesDe(['inventarios'])).toHaveLength(8);
    expect(registro.definicionConfiguracion('inventarios.codigos.prefijo')?.predeterminado).toBe('ART-');
  });
});
