import { describe, expect, it } from 'vitest';
import { totalesDe } from '../pruebas/dobles-de-totales-por-concepto.js';
import { armarFlujoDeEfectivo, ubicarEnElFlujo } from './calculo-de-flujo-de-efectivo.js';
import type { SaldosDelRango, TotalesDeUnConcepto } from './dto/reportes-por-concepto.dto.js';

const marcoDeTodas = { desde: '2026-02-01', hasta: '2026-02-28', cuentaBancariaId: null };
const marcoDeUna = { ...marcoDeTodas, cuentaBancariaId: 'cb-1' };
const saldos = (saldoAlInicio: string, saldoAlFinal: string): SaldosDelRango => ({ saldoAlInicio, saldoAlFinal });

const ventas = totalesDe({ conceptoId: 'v', grupoDeFlujo: 'Cobros a clientes', entradas: '500.00' });
const transferencia = (entradas: string, salidas: string) =>
  totalesDe({ conceptoId: 't', claveDeSistema: 'transferencia', actividadDeFlujo: 'ninguna', entradas, salidas });

describe('ubicar un concepto en el flujo', () => {
  const ubicar = (cambios: Partial<TotalesDeUnConcepto>) => ubicarEnElFlujo(totalesDe(cambios));

  it('agrupa por grupo de flujo y, sin grupo, por el nombre del concepto', () => {
    expect(ubicar({ grupoDeFlujo: 'Cobros a clientes' })).toEqual({
      donde: 'actividad',
      actividad: 'operacion',
      etiqueta: 'Cobros a clientes',
    });
    expect(ubicar({ actividadDeFlujo: 'inversion', conceptoNombre: 'Compra de terreno' })).toEqual({
      donde: 'actividad',
      actividad: 'inversion',
      etiqueta: 'Compra de terreno',
    });
  });

  it('el saldo inicial es apertura; transferencias y sin clasificar van aparte, y lo demás sin actividad también', () => {
    expect(ubicar({ claveDeSistema: 'saldo_inicial', actividadDeFlujo: 'ninguna' })).toEqual({ donde: 'apertura' });
    expect(ubicar({ claveDeSistema: 'transferencia', actividadDeFlujo: 'ninguna' })).toEqual({
      donde: 'aparte',
      clave: 'transferencias',
    });
    expect(ubicar({ claveDeSistema: 'sin_clasificar', actividadDeFlujo: 'ninguna' })).toEqual({
      donde: 'aparte',
      clave: 'sin_clasificar',
    });
    expect(ubicar({ conceptoNombre: 'Fondo de caja', actividadDeFlujo: 'ninguna' })).toEqual({
      donde: 'aparte',
      clave: 'sin_actividad',
    });
  });
});

describe('flujo de efectivo (método directo)', () => {
  it('siempre trae las tres actividades, junta los conceptos de un grupo y suma en centavos', () => {
    const totales = [
      ventas,
      totalesDe({
        conceptoId: 'v2',
        conceptoNombre: 'Ventas de contado',
        grupoDeFlujo: 'Cobros a clientes',
        entradas: '0.10',
      }),
      totalesDe({ conceptoId: 'p', grupoDeFlujo: 'Pagos de planilla', salidas: '200.20' }),
      totalesDe({
        conceptoId: 'i',
        actividadDeFlujo: 'inversion',
        grupoDeFlujo: 'Compra de activos',
        salidas: '50.00',
      }),
    ];

    const reporte = armarFlujoDeEfectivo(totales, saldos('1000.00', '1249.90'), marcoDeTodas);

    expect(reporte.actividades.map((a) => a.actividad)).toEqual(['operacion', 'inversion', 'financiamiento']);
    const [operacion, inversion, financiamiento] = reporte.actividades;
    expect(operacion!.lineas.map((l) => [l.etiqueta, l.entradas, l.salidas, l.neto])).toEqual([
      ['Cobros a clientes', '500.10', '0.00', '500.10'],
      ['Pagos de planilla', '0.00', '200.20', '-200.20'],
    ]);
    expect(operacion).toMatchObject({ entradas: '500.10', salidas: '200.20', neto: '299.90' });
    expect(inversion).toMatchObject({ neto: '-50.00' });
    expect(financiamiento).toMatchObject({ lineas: [], neto: '0.00' });
    expect(reporte.control).toMatchObject({ flujoNeto: '249.90', cuadra: true, diferencia: '0.00' });
  });

  it('un inverso resta en la línea de su original: el período de la anulación queda con salidas negativas y cuadra', () => {
    // Un cheque de 100.00 salió en enero; su anulación (crédito inverso) entra en febrero.
    const cheque = totalesDe({
      grupoDeFlujo: 'Pagos a proveedores',
      salidas: '-100.00',
      cantidad: 0,
      cantidadDeInversos: 1,
    });

    const reporte = armarFlujoDeEfectivo([cheque], saldos('900.00', '1000.00'), marcoDeTodas);

    expect(reporte.actividades[0]!.lineas).toEqual([
      { etiqueta: 'Pagos a proveedores', entradas: '0.00', salidas: '-100.00', neto: '100.00', cantidad: 0 },
    ]);
    expect(reporte.control).toMatchObject({ saldoCalculado: '1000.00', cuadra: true });
  });

  it('con todas las cuentas las transferencias se anulan y no aparecen; con una cuenta salen en su línea', () => {
    const totales = [transferencia('300.00', '300.00')];

    const deLaEmpresa = armarFlujoDeEfectivo(totales, saldos('0.00', '0.00'), marcoDeTodas);
    const deUna = armarFlujoDeEfectivo([transferencia('300.00', '0.00')], saldos('0.00', '300.00'), marcoDeUna);

    expect(deLaEmpresa.lineasAparte.map((l) => l.clave)).toEqual(['sin_clasificar']);
    expect(deUna.lineasAparte.map((l) => [l.clave, l.etiqueta, l.neto])).toEqual([
      ['transferencias', 'Transferencias entre cuentas propias', '300.00'],
      ['sin_clasificar', 'Sin clasificar (pendiente)', '0.00'],
    ]);
    expect(deUna.control.cuadra).toBe(true);
  });

  it('si con todas las cuentas las transferencias no se anularan, se muestran para que se vea', () => {
    const reporte = armarFlujoDeEfectivo([transferencia('300.00', '0.00')], saldos('0.00', '300.00'), marcoDeTodas);

    expect(reporte.lineasAparte.map((l) => l.clave)).toContain('transferencias');
  });

  it('el saldo inicial es apertura y no flujo: entra al control pero no a las líneas', () => {
    const apertura = totalesDe({ claveDeSistema: 'saldo_inicial', actividadDeFlujo: 'ninguna', entradas: '1000.00' });

    const reporte = armarFlujoDeEfectivo([apertura, ventas], saldos('0.00', '1500.00'), marcoDeTodas);

    expect(reporte.control).toMatchObject({
      saldosInicialesDelRango: '1000.00',
      flujoNeto: '500.00',
      saldoCalculado: '1500.00',
      cuadra: true,
    });
    expect(reporte.lineasAparte.map((l) => l.clave)).toEqual(['sin_clasificar']);
  });

  it('sin actividad y sin clasificar tienen su línea; sin clasificar se ve aunque esté en cero', () => {
    const otros = totalesDe({
      conceptoId: 'o',
      conceptoNombre: 'Fondo de caja',
      actividadDeFlujo: 'ninguna',
      salidas: '20.00',
    });
    const pendiente = totalesDe({
      claveDeSistema: 'sin_clasificar',
      actividadDeFlujo: 'ninguna',
      entradas: '5.00',
      cantidad: 2,
    });

    const reporte = armarFlujoDeEfectivo([otros, pendiente], saldos('100.00', '85.00'), marcoDeTodas);

    expect(reporte.lineasAparte).toEqual([
      {
        clave: 'sin_actividad',
        etiqueta: 'Otros movimientos sin actividad',
        entradas: '0.00',
        salidas: '20.00',
        neto: '-20.00',
        cantidad: 1,
      },
      {
        clave: 'sin_clasificar',
        etiqueta: 'Sin clasificar (pendiente)',
        entradas: '5.00',
        salidas: '0.00',
        neto: '5.00',
        cantidad: 2,
      },
    ]);
    expect(reporte.control.cuadra).toBe(true);
  });

  it('si los saldos no cuadran con las líneas, lo dice con la diferencia', () => {
    const reporte = armarFlujoDeEfectivo([ventas], saldos('0.00', '499.99'), marcoDeTodas);

    expect(reporte.control).toMatchObject({ saldoCalculado: '500.00', diferencia: '-0.01', cuadra: false });
  });
});
