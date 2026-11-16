import { describe, expect, it } from 'vitest';
import {
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { MovimientoDelProveedor } from '../../../dominio/estado-de-cuenta.js';
import { cifrasEnCero, type SaldoDeProveedor } from '../../../dominio/saldos-por-nit.js';
import { CargaInicialEnMemoria } from '../../../pruebas/dobles-de-saldos-iniciales.js';
import type {
  ConsultasDeReportesDeProveedor,
  ContrasenaPorPagar,
  FiltroDeContrasenasPorPagar,
  RangoDelEstado,
} from '../../puertos/puertos-de-reportes-de-proveedor.js';
import type { BaseDelCorte, ConsultasDeSaldosAlCorte } from '../../puertos/puertos-de-saldos-al-corte.js';
import { ReporteDeContrasenasPorPagar } from './reporte-de-contrasenas-por-pagar.js';
import { ReporteDeEstadoDeCuenta } from './reporte-de-estado-de-cuenta.js';
import { ReporteDeSaldosAFavor } from './reporte-de-saldos-a-favor.js';

const PROVEEDOR = '11111111-1111-4111-8111-111111111111';
const SIN_AVISOS = {
  anterioresAlInicio: { cantidad: 0, totalCentavos: 0 },
  registradosDespues: { cantidad: 0, totalCentavos: 0 },
  chequesCobradosAntes: [],
};

class ConsultasDeLaPrueba implements ConsultasDeSaldosAlCorte, ConsultasDeReportesDeProveedor {
  cortes: string[] = [];
  rango: RangoDelEstado | undefined;
  contrasenas: FiltroDeContrasenasPorPagar | undefined;
  movimientos: MovimientoDelProveedor[] = [];
  proveedorExisteEnLaCuenta = true;
  /** El saldo neto que da cada corte (cero si no se dice). */
  netoAl = new Map<string, number>();

  async proveedorExiste() {
    return this.proveedorExisteEnLaCuenta;
  }
  async datosDelProveedor() {
    return this.proveedorExisteEnLaCuenta ? { nombre: 'Alfa S.A.', nit: '5900001' } : null;
  }
  async saldosPorProveedor({ corte }: BaseDelCorte): Promise<SaldoDeProveedor[]> {
    this.cortes.push(corte);
    const neto = this.netoAl.get(corte) ?? 0;
    return [{ ...cifrasEnCero(), proveedorId: PROVEEDOR, nombre: 'Alfa S.A.', nit: null, neto, comprometido: 1_000 }];
  }
  async avisosDelCorte() {
    return SIN_AVISOS;
  }
  async documentos(): Promise<never> {
    throw new Error('No se usa.');
  }
  async movimientosDelProveedor(rango: RangoDelEstado) {
    this.rango = rango;
    return this.movimientos;
  }
  async retencionesDelProveedor() {
    return [];
  }
  async notasConSaldoAlCorte() {
    return [
      {
        id: 'n1',
        proveedorId: PROVEEDOR,
        proveedorNombre: 'Alfa S.A.',
        proveedorNit: null,
        serie: null,
        numero: '9',
        fechaEmision: '2020-01-10',
        baseCentavos: 50_000,
        aplicadoCentavos: 0,
        ajustadoCentavos: 0,
        reintegradoCentavos: 0,
        saldoCentavos: 50_000,
        ultimoMovimiento: '2020-01-10',
        enContrasena: false,
      },
    ];
  }
  async contrasenasPorPagar(filtro: FiltroDeContrasenasPorPagar): Promise<ContrasenaPorPagar[]> {
    this.contrasenas = filtro;
    return [
      {
        id: 'c1',
        numero: '3',
        proveedorId: PROVEEDOR,
        proveedorNombre: 'Alfa S.A.',
        fecha: '2026-02-01',
        pagoPrometido: '2026-03-10',
        vence: '2026-02-20',
        documentosConSaldo: 2,
        saldoCentavos: 30_000,
        autorizadoCentavos: 20_000,
        sinAutorizarCentavos: 10_000,
        comprometidoCentavos: 0,
        impresa: true,
      },
    ];
  }
}

function dependencias(consultas: ConsultasDeLaPrueba) {
  return {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    reloj: new RelojFijo('2026-03-15'),
    cargaInicial: new CargaInicialEnMemoria(),
    consultas,
    consultasDeProveedor: consultas,
  };
}

const solicitud = { proveedorId: PROVEEDOR, mostrarAnulados: false, presentacion: 'interna' as const };
const pantalla = { sinTope: false };

function pagoDeUnCentavo(dia: number): MovimientoDelProveedor {
  return {
    hecho: 'pago',
    fecha: `2026-03-${String(dia).padStart(2, '0')}`,
    registradoEn: '2026-03-01 08:00:00',
    esCargo: false,
    montoCentavos: 1,
    anulado: false,
    documento: null,
    registro: { numero: String(dia), forma: 'cheque', referencia: null },
    detalle: null,
  };
}

describe('ReporteDeEstadoDeCuenta', () => {
  it('sin rango va del primer día del mes a hoy y toma el saldo anterior del día anterior al inicio', async () => {
    const consultas = new ConsultasDeLaPrueba();
    consultas.netoAl.set('2026-02-28', 70_000);
    consultas.movimientos = [pagoDeUnCentavo(2)];

    const reporte = await new ReporteDeEstadoDeCuenta(dependencias(consultas)).ejecutar(
      operadorDePrueba(),
      solicitud,
      pantalla,
    );

    expect(reporte).toMatchObject({ desde: '2026-03-01', hasta: '2026-03-15' });
    expect(reporte.totales).toEqual({ saldoAnterior: '700.00', cargos: '0.00', abonos: '0.01', saldoFinal: '699.99' });
    expect(consultas.cortes).toEqual(expect.arrayContaining(['2026-02-28', '2026-03-15']));
    expect(reporte.alCorte).toEqual({ comprometido: '10.00', disponible: '-10.00' });
  });

  it('rechaza un rango al revés o de más de 24 meses, y un proveedor que no existe', async () => {
    const consultas = new ConsultasDeLaPrueba();
    const caso = new ReporteDeEstadoDeCuenta(dependencias(consultas));

    await expect(
      caso.ejecutar(operadorDePrueba(), { ...solicitud, desde: '2026-03-10', hasta: '2026-03-01' }, pantalla),
    ).rejects.toMatchObject({ codigo: 'rango_de_reporte_invalido' });
    await expect(
      caso.ejecutar(operadorDePrueba(), { ...solicitud, desde: '2024-01-01', hasta: '2026-03-01' }, pantalla),
    ).rejects.toMatchObject({ codigo: 'rango_de_reporte_muy_largo' });
    consultas.proveedorExisteEnLaCuenta = false;
    await expect(caso.ejecutar(operadorDePrueba(), solicitud, pantalla)).rejects.toMatchObject({
      codigo: 'proveedor_del_reporte_no_existe',
    });
  });

  it('rechaza un saldo anterior antes del día anterior a la fecha de inicio', async () => {
    const caso = new ReporteDeEstadoDeCuenta(dependencias(new ConsultasDeLaPrueba()));

    await expect(
      caso.ejecutar(operadorDePrueba(), { ...solicitud, desde: '2025-12-31', hasta: '2026-03-01' }, pantalla),
    ).rejects.toMatchObject({ codigo: 'corte_anterior_al_inicio' });
  });

  it('la pantalla tiene tope de líneas y Excel no', async () => {
    const consultas = new ConsultasDeLaPrueba();
    consultas.movimientos = Array.from({ length: 2001 }, () => pagoDeUnCentavo(2));
    const caso = new ReporteDeEstadoDeCuenta(dependencias(consultas));

    await expect(caso.ejecutar(operadorDePrueba(), solicitud, pantalla)).rejects.toMatchObject({
      codigo: 'estado_de_cuenta_con_demasiadas_lineas',
    });
    const completo = await caso.ejecutar(operadorDePrueba(), solicitud, { sinTope: true });
    expect(completo.lineas).toHaveLength(2001);
  });

  it('para el proveedor no lleva lo comprometido, avisos ni leyendas internas', async () => {
    const consultas = new ConsultasDeLaPrueba();

    const reporte = await new ReporteDeEstadoDeCuenta(dependencias(consultas)).ejecutar(
      operadorDePrueba(),
      { ...solicitud, presentacion: 'para_el_proveedor' },
      pantalla,
    );

    expect(reporte.alCorte).toBeUndefined();
    expect(reporte.leyendas).toEqual([]);
  });
});

describe('ReporteDeSaldosAFavor', () => {
  it('clasifica por años desde el último movimiento y avisa de la prescripción', async () => {
    const reporte = await new ReporteDeSaldosAFavor(dependencias(new ConsultasDeLaPrueba())).ejecutar(
      operadorDePrueba(),
      { incluirSinSaldo: false },
    );

    expect(reporte.filas[0]).toMatchObject({
      aniosDesdeElUltimoMovimiento: 6,
      tramo: 'de_5_o_mas',
      posiblePrescripcionDesde: '2025-01-10',
      posiblementePrescrito: true,
    });
    expect(reporte.posiblementePrescrito).toEqual({ cantidad: 1, total: '500.00' });
    expect(reporte.leyendas.join(' ')).toContain('La prescripción no opera sola');
  });
});

describe('ReporteDeContrasenasPorPagar', () => {
  it('por omisión pide las que prometieron pagar hasta ayer y cuenta los días de atraso', async () => {
    const consultas = new ConsultasDeLaPrueba();

    const reporte = await new ReporteDeContrasenasPorPagar(dependencias(consultas)).ejecutar(operadorDePrueba(), {});

    expect(consultas.contrasenas).toMatchObject({ hoy: '2026-03-15', pagoPrometidoHasta: '2026-03-14' });
    expect(reporte.filas[0]).toMatchObject({ diasDeAtraso: 5, saldo: '300.00', autorizado: '200.00' });
    expect(reporte.totales).toEqual({ cantidad: 1, saldo: '300.00', autorizado: '200.00', sinAutorizar: '100.00' });
  });
});
