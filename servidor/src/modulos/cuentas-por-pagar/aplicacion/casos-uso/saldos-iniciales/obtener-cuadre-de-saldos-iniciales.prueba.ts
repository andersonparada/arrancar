import { describe, expect, it } from 'vitest';
import { UnidadDeTrabajoEnMemoria, operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { CargaInicialEnMemoria } from '../../../pruebas/dobles-de-saldos-iniciales.js';
import type { ConsultasDeCuadre, SumasDeProveedorEnElCuadre } from '../../puertos/puertos-de-cuadre.js';
import { ObtenerCuadreDeSaldosIniciales } from './obtener-cuadre-de-saldos-iniciales.js';

const proveedor = (cambios: Partial<SumasDeProveedorEnElCuadre>): SumasDeProveedorEnElCuadre => ({
  proveedorId: crypto.randomUUID(),
  proveedorNombre: 'Proveedor',
  proveedorNit: null,
  documentos: 1,
  cargosCentavos: 0,
  notasAFavorCentavos: 0,
  retencionesPorPracticarCentavos: 0,
  ...cambios,
});

function cuadreCon(filas: SumasDeProveedorEnElCuadre[], carga = new CargaInicialEnMemoria()) {
  const consultas: ConsultasDeCuadre = { sumasPorProveedor: async () => filas };
  const caso = new ObtenerCuadreDeSaldosIniciales({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    consultas,
    cargaInicial: carga,
  });
  return caso.ejecutar(operadorDePrueba());
}

describe('ObtenerCuadreDeSaldosIniciales', () => {
  it('calcula el neto de cada proveedor y suma el general en centavos', async () => {
    const cuadre = await cuadreCon([
      proveedor({
        documentos: 3,
        cargosCentavos: 100_050,
        notasAFavorCentavos: 50_000,
        retencionesPorPracticarCentavos: 2_000,
      }),
      proveedor({ documentos: 1, notasAFavorCentavos: 8_010 }),
    ]);

    expect(cuadre.proveedores.map((p) => p.neto)).toEqual(['500.50', '-80.10']);
    expect(cuadre.general).toEqual({
      documentos: 4,
      cargos: '1000.50',
      notasAFavor: '580.10',
      neto: '420.40',
      retencionesPorPracticar: '20.00',
    });
  });

  it('sin saldos devuelve ceros y trae el estado de la carga', async () => {
    const carga = new CargaInicialEnMemoria({ fechaDeInicio: '2026-01-01', cerrada: true });

    const cuadre = await cuadreCon([], carga);

    expect(cuadre.proveedores).toEqual([]);
    expect(cuadre.general.neto).toBe('0.00');
    expect(cuadre.carga).toEqual({ fechaDeInicio: '2026-01-01', cerrada: true });
    expect(carga.consultas).toBe(1);
  });
});
