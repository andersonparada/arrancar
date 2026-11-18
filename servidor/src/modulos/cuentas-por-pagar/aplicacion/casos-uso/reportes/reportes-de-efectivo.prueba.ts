import { describe, expect, it } from 'vitest';
import {
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { CargaInicialEnMemoria } from '../../../pruebas/dobles-de-saldos-iniciales.js';
import type { ConsultasDeNotasSinAplicar, NotaSinAplicar } from '../../puertos/puertos-de-notas-sin-aplicar.js';
import type { ConsultasDeRetiros, FiltroDeRetiros } from '../../puertos/puertos-de-retiros.js';
import {
  ReporteDeNotasSinAplicar,
  ReporteDeRetirosPorLiquidar,
  type DependenciasDeReportesDeEfectivo,
} from './reportes-de-efectivo.js';

class NotasDeLaPrueba implements ConsultasDeNotasSinAplicar {
  corte: string | undefined;

  constructor(private readonly notas: NotaSinAplicar[]) {}

  async notasSinAplicar({ corte }: { corte: string }) {
    this.corte = corte;
    return this.notas;
  }
}

class RetirosDeLaPrueba {
  filtro: FiltroDeRetiros | undefined;

  async listar(filtro: FiltroDeRetiros) {
    this.filtro = filtro;
    return {
      total: 1,
      totalDisponibleCentavos: 15_000,
      filas: [
        {
          retiro: {
            id: 'r1',
            numero: 3,
            anioDeNumero: 2026,
            forma: 'cheque' as const,
            fecha: '2026-02-20',
            montoCentavos: 20_000,
            movimientoId: 'm1',
            custodio: 'Juan',
            custodioUsuarioId: null,
            observaciones: null,
            estado: 'abierto' as const,
            fechaDeLiquidacion: null,
            liquidadoPor: null,
            devueltoCentavos: 0,
            movimientoDeDevolucionId: null,
            faltanteCentavos: 0,
            motivoDeFaltante: null,
            fechaDeAnulacion: null,
            motivoDeAnulacion: null,
          },
          cuentaBancariaId: 'c1',
          numeroDelDocumento: 77,
          pagadoCentavos: 5_000,
          disponibleCentavos: 15_000,
        },
      ],
    };
  }
}

function dependencias(
  notas: ConsultasDeNotasSinAplicar,
  retiros: Pick<ConsultasDeRetiros, 'listar'> = new RetirosDeLaPrueba(),
): DependenciasDeReportesDeEfectivo {
  return {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    reloj: new RelojFijo('2026-03-15'),
    cargaInicial: new CargaInicialEnMemoria(),
    consultas: { proveedorExiste: async () => true } as unknown as DependenciasDeReportesDeEfectivo['consultas'],
    consultasDeRetiros: retiros as ConsultasDeRetiros,
    notasSinAplicar: notas,
  };
}

const nota: NotaSinAplicar = {
  movimientoId: 'm1',
  cuentaBancariaId: 'c1',
  cuenta: 'Cuenta',
  fecha: '2026-02-01',
  numero: 5,
  referencia: 'Boleta',
  montoCentavos: 100_000,
  aplicadoCentavos: 30_000,
  conciliada: true,
};

describe('ReporteDeNotasSinAplicar (R11)', () => {
  it('por omisión corta al fin del mes anterior y totaliza lo disponible', async () => {
    const notas = new NotasDeLaPrueba([
      nota,
      { ...nota, movimientoId: 'm2', montoCentavos: 5_000, aplicadoCentavos: 0 },
    ]);

    const reporte = await new ReporteDeNotasSinAplicar(dependencias(notas)).ejecutar(operadorDePrueba(), {});

    expect(notas.corte).toBe('2026-02-28');
    expect(reporte.corte).toBe('2026-02-28');
    expect(reporte.filas[0]).toMatchObject({ disponible: '700.00', diasSinAplicar: 27, conciliada: true });
    expect(reporte.total).toEqual({ cantidad: 2, monto: '1050.00', aplicado: '300.00', disponible: '750.00' });
  });

  it('rechaza un corte anterior al día antes de la fecha de inicio', async () => {
    const caso = new ReporteDeNotasSinAplicar(dependencias(new NotasDeLaPrueba([])));

    await expect(caso.ejecutar(operadorDePrueba(), { corte: '2025-12-30' })).rejects.toMatchObject({
      codigo: 'corte_anterior_al_inicio',
    });
  });
});

describe('ReporteDeRetirosPorLiquidar (R10)', () => {
  it('pide los retiros abiertos al corte (hoy por omisión) y arma los días y el aviso de mes anterior', async () => {
    const retiros = new RetirosDeLaPrueba();

    const reporte = await new ReporteDeRetirosPorLiquidar(dependencias(new NotasDeLaPrueba([]), retiros)).ejecutar(
      operadorDePrueba(),
      { custodio: 'Jua' },
    );

    expect(retiros.filtro).toMatchObject({ corte: '2026-03-15', custodio: 'Jua', soloConDisponible: false });
    expect(reporte.filas[0]).toMatchObject({
      numero: '2026-3',
      documento: 77,
      diasAbierto: 23,
      deMesAnterior: true,
      pagado: '50.00',
      disponible: '150.00',
    });
    expect(reporte.total).toEqual({ cantidad: 1, monto: '200.00', pagado: '50.00', disponible: '150.00' });
  });
});
