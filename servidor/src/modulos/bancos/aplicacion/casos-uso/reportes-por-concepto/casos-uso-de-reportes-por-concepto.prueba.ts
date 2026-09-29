import { describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { UnidadDeTrabajoEnMemoria, operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { ConsultasDeTotalesFijas, totalesDe } from '../../../pruebas/dobles-de-totales-por-concepto.js';
import type { TotalesDeUnConcepto } from '../../dto/reportes-por-concepto.dto.js';
import { ReporteDeFlujoDeEfectivo } from './reporte-de-flujo-de-efectivo.js';
import { ReporteDeMovimientosPorConcepto } from './reporte-de-movimientos-por-concepto.js';

const operador = operadorDePrueba();
const rango = { desde: '2026-02-01', hasta: '2026-02-28' };

function armar(totales: TotalesDeUnConcepto[], cuentas: string[] = ['cb-1']) {
  const consultas = new ConsultasDeTotalesFijas(totales, { saldoAlInicio: '100.00', saldoAlFinal: '150.00' }, cuentas);
  const dependencias = { unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(), consultas };
  return {
    consultas,
    flujo: new ReporteDeFlujoDeEfectivo(dependencias),
    porConcepto: new ReporteDeMovimientosPorConcepto(dependencias),
  };
}

describe('reporte de flujo de efectivo', () => {
  it('sin cuenta son todas las de la empresa y devuelve el control de cuadre', async () => {
    const { flujo, consultas } = armar([totalesDe({ entradas: '50.00' })]);

    const reporte = await flujo.ejecutar(operador, rango);

    expect(reporte).toMatchObject({ ...rango, cuentaBancariaId: null });
    expect(reporte.control).toMatchObject({ saldoAlInicio: '100.00', saldoAlFinal: '150.00', cuadra: true });
    expect(consultas.filtros).toEqual([rango]);
  });

  it('con una cuenta que no es de la empresa responde que no existe', async () => {
    const { flujo } = armar([]);

    await expect(flujo.ejecutar(operador, { ...rango, cuentaBancariaId: 'ajena' })).rejects.toBeInstanceOf(
      RecursoNoEncontrado,
    );
  });
});

describe('reporte de movimientos por concepto', () => {
  it('ordena por nombre, marca los de sistema y suma el total en centavos', async () => {
    const { porConcepto } = armar([
      totalesDe({ conceptoId: 'b', conceptoNombre: 'Viáticos', salidas: '10.10', cantidad: 2 }),
      totalesDe({ conceptoId: 'a', conceptoNombre: 'Ámbar', entradas: '0.20', cantidad: 1, cantidadDeInversos: 1 }),
      totalesDe({
        conceptoId: 's',
        conceptoNombre: 'Sin clasificar',
        claveDeSistema: 'sin_clasificar',
        entradas: '0.10',
      }),
    ]);

    const reporte = await porConcepto.ejecutar(operador, { ...rango, conceptoIds: ['a', 'b'] });

    expect(reporte.conceptos.map((c) => [c.conceptoNombre, c.esDeSistema, c.neto])).toEqual([
      ['Ámbar', false, '0.20'],
      ['Sin clasificar', true, '0.10'],
      ['Viáticos', false, '-10.10'],
    ]);
    expect(reporte).toMatchObject({ entradas: '0.30', salidas: '10.10', neto: '-9.80', cantidad: 4 });
  });

  it('pasa la cuenta y los conceptos elegidos a la consulta', async () => {
    const { porConcepto, consultas } = armar([]);

    await porConcepto.ejecutar(operador, { ...rango, cuentaBancariaId: 'cb-1', conceptoIds: ['a'] });

    expect(consultas.filtros).toEqual([{ ...rango, cuentaBancariaId: 'cb-1', conceptoIds: ['a'] }]);
  });
});
