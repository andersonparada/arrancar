import { describe, expect, it } from 'vitest';
import { casillasDelSat2237 } from './casillas-del-sat-2237.js';
import { documento } from './documentos-de-prueba-del-sat-2237.js';
import { MAPA_DE_CASILLAS_SAT_2237, type MapaDeCasillas } from './mapa-de-casillas-del-sat-2237.js';
import { proveedoresDelSat2237 } from './proveedores-del-sat-2237.js';
import { rubrosDelSat2237 } from './rubros-del-sat-2237.js';
import { vistaDelFormularioSat2237 } from './vista-del-formulario-sat-2237.js';

describe('casillas y vista del formulario', () => {
  it('varios rubros suman en una casilla y las importaciones se reparten en cuatro', () => {
    const rubros = rubrosDelSat2237([
      documento({ motivoSinCredito: 'fuera_de_plazo', ivaNoAcreditable: 12000 }),
      documento({ motivoSinCredito: 'exento', base: 0, iva: 0, exento: 5000 }),
      documento({ tipo: 'factura_primario_pecuario', motivoSinCredito: 'primario_pecuario', base: 30000 }),
      documento(),
    ]);
    const casillas = casillasDelSat2237(rubros);
    const por = (clave: string) => casillas.find((c) => c.clave === clave)!;

    expect(por('sin_derecho_a_compensacion')).toMatchObject({
      rubros: ['regimenes_sin_iva', 'compras_sin_credito', 'exento_y_no_afecto'],
      neto: { base: 100000 + 30000 + 5000, iva: 12000 },
    });
    expect(por('bienes').neto).toEqual({ base: 100000, iva: 12000 });
    expect(
      ['importaciones_centro_america', 'importaciones_fyduca', 'importaciones_resto_del_mundo'].map((c) => por(c).neto),
    ).toEqual([
      { base: 0, iva: 0 },
      { base: 0, iva: 0 },
      { base: 0, iva: 0 },
    ]);
    expect(por('remanente')).toMatchObject({ llenaLaSat: true, rubros: [] });
  });

  it('un rubro con partes se reparte entre sus casillas', () => {
    const rubros = rubrosDelSat2237([]).map((r) =>
      r.clave === 'importaciones'
        ? { ...r, partes: { fyduca: { base: 700, iva: 84 }, activos_fijos: { base: 300, iva: 36 } } }
        : r,
    );
    const por = (clave: string) => casillasDelSat2237(rubros).find((c) => c.clave === clave)!;

    expect(por('importaciones_fyduca').neto).toEqual({ base: 700, iva: 84 });
    expect(por('activos_fijos_importados').neto).toEqual({ base: 300, iva: 36 });
    expect(por('importaciones_centro_america').neto).toEqual({ base: 0, iva: 0 });
  });

  it('un mapa de prueba cambia los nombres sin tocar el cálculo', () => {
    const mapa: MapaDeCasillas = {
      ...MAPA_DE_CASILLAS_SAT_2237,
      seccion5: {
        nombre: 'Prueba',
        casillas: [{ clave: 'bienes', nombre: 'Compras', ivaDeCredito: true, llenaLaSat: false }],
      },
    };

    expect(casillasDelSat2237(rubrosDelSat2237([documento()]), mapa)).toEqual([
      expect.objectContaining({ nombre: 'Compras', neto: { base: 100000, iva: 12000 } }),
    ]);
  });

  it('la sección 6 lleva diez proveedores con NIT, facturas y base positiva, de mayor a menor base', () => {
    const documentos = Array.from({ length: 12 }, (_, i) =>
      documento({ nitDelProveedor: `${1000 + i}`, base: 1000 * (i + 1), iva: 120 * (i + 1) }),
    );
    const { proveedores } = proveedoresDelSat2237(documentos);
    const vista = vistaDelFormularioSat2237({ rubros: [], segmento9: [], proveedores });

    expect(vista.seccion6.filas).toHaveLength(10);
    expect(vista.seccion6.filas[0]?.nit).toBe('1011');
    expect(vista.seccion6.sinLugar).toBe(2);
    expect(vista.confirmado).toBe(false);
    expect(vista.version).toContain('Declaraguate');
  });
});
