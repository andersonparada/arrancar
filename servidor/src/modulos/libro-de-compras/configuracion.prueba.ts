import { describe, expect, it } from 'vitest';
import { RegistroModulos } from '../core/modulos-sistema/registro-modulos.js';
import { configuracionDelLibroDeCompras } from './configuracion.js';
import { moduloLibroDeCompras } from './modulo.js';

const PREDETERMINADOS: Record<string, number | boolean> = {
  'libro-de-compras.iva.tasa': 12,
  'libro-de-compras.retenciones_iva.exportador_agropecuario': 65,
  'libro-de-compras.retenciones_iva.exportador': 15,
  'libro-de-compras.retenciones_iva.contribuyente_especial': 15,
  'libro-de-compras.retenciones_iva.otro_agente': 15,
  'libro-de-compras.retenciones_iva.sector_publico': 25,
  'libro-de-compras.retenciones_iva.minimo': 2500,
  'libro-de-compras.retenciones_iva.minimo_sector_publico': 30000,
  'libro-de-compras.retenciones_iva.pequeno_contribuyente': 5,
  'libro-de-compras.retenciones_iva.umbral_pequeno_contribuyente': 2500,
  'libro-de-compras.retenciones_isr.tasa_primer_tramo': 5,
  'libro-de-compras.retenciones_isr.limite_primer_tramo': 30000,
  'libro-de-compras.retenciones_isr.tasa_excedente': 7,
  'libro-de-compras.retenciones_isr.minimo': 2500,
  'libro-de-compras.retenciones_isr.incluye_idp': true,
  'libro-de-compras.plazos.dias_habiles_entero_iva': 15,
  'libro-de-compras.plazos.dias_habiles_entero_isr': 10,
};

describe('configuración del libro de compras (§8)', () => {
  it('declara las 16 variables de la sección 8 y la del IDP en la base del ISR con sus valores por omisión', () => {
    const declaradas = Object.fromEntries(configuracionDelLibroDeCompras.map((c) => [c.clave, c.predeterminado]));
    expect(declaradas).toEqual(PREDETERMINADOS);
  });

  it('son de instalación (el IDP del ISR también de empresa), no públicas, y su omisión pasa su esquema', () => {
    for (const definicion of configuracionDelLibroDeCompras) {
      const incluyeIdp = definicion.clave === 'libro-de-compras.retenciones_isr.incluye_idp';
      expect(definicion.niveles).toEqual(incluyeIdp ? ['instalacion', 'empresa'] : ['instalacion']);
      expect(definicion.publica).toBe(false);
      expect(definicion.esquema.safeParse(definicion.predeterminado).success).toBe(true);
    }
  });

  it('el módulo las registra y el registro las encuentra por clave', () => {
    const registro = new RegistroModulos([
      moduloLibroDeCompras,
      { clave: 'terceros', nombre: 'T', descripcion: '', permisos: [] },
    ]);
    expect(registro.configuracionesDe(['libro-de-compras'])).toHaveLength(17);
    expect(registro.definicionConfiguracion('libro-de-compras.iva.tasa')?.predeterminado).toBe(12);
  });

  it('los porcentajes aceptan centésimas y rechazan lo que pasa de 100 o tiene más decimales', () => {
    const tasa = configuracionDelLibroDeCompras.find((c) => c.clave === 'libro-de-compras.iva.tasa');
    expect([12.5, 0.07, 100, 0].map((v) => tasa?.esquema.safeParse(v).success)).toEqual([true, true, true, true]);
    expect([100.01, -1, 0.005].map((v) => tasa?.esquema.safeParse(v).success)).toEqual([false, false, false]);
  });

  it('los plazos son días enteros positivos', () => {
    const plazo = configuracionDelLibroDeCompras.find(
      (c) => c.clave === 'libro-de-compras.plazos.dias_habiles_entero_iva',
    );
    expect([plazo?.esquema.safeParse(0).success, plazo?.esquema.safeParse(2.5).success]).toEqual([false, false]);
  });
});
