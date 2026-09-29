import { describe, expect, it } from 'vitest';
import {
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import {
  ConsultasDeChequesEnCirculacionFijas,
  PoliticaDeVencimientoFija,
} from '../../../pruebas/dobles-de-cheques-en-circulacion.js';
import type { ChequeEnCirculacionCrudo } from '../../puertos/consultas-de-cheques-en-circulacion.js';
import { ReporteDeChequesCaducos } from './reporte-de-cheques-caducos.js';

const operador = operadorDePrueba();

const cheque = (cambios: Partial<ChequeEnCirculacionCrudo>): ChequeEnCirculacionCrudo => ({
  chequeId: 'c-1',
  movimientoId: 'm-1',
  cuentaBancariaId: 'cb-1',
  cuentaBancariaNombre: 'Monetaria',
  serie: null,
  numero: 1,
  fecha: '2026-01-10',
  beneficiario: 'Proveedor',
  monto: '100.50',
  mesConciliado: false,
  ...cambios,
});

function armar(cheques: ChequeEnCirculacionCrudo[], mesesDeLaVariable = 7) {
  const consultas = new ConsultasDeChequesEnCirculacionFijas(cheques);
  const reporte = new ReporteDeChequesCaducos({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    consultas,
    politicaDeVencimiento: new PoliticaDeVencimientoFija(mesesDeLaVariable),
    reloj: new RelojFijo('2026-09-29'),
  });
  return { consultas, reporte };
}

describe('reporte de cheques caducos', () => {
  it('usa la variable de la empresa: corte a 7 meses, días de antigüedad, origen suelto y totales en centavos', async () => {
    const { reporte } = armar([cheque({}), cheque({ chequeId: 'c-2', numero: 2, monto: '0.10' })]);

    const resultado = await reporte.ejecutar(operador);

    expect(resultado).toMatchObject({
      mesesDeAntiguedad: 7,
      fechaDeCorte: '2026-02-28',
      totalDeCheques: 2,
      montoTotal: '100.60',
    });
    expect(resultado.cheques[0]).toMatchObject({ diasDeAntiguedad: 262, origen: 'suelto' });
  });

  it('el filtro de meses manda sobre la variable', async () => {
    const { consultas, reporte } = armar([], 7);

    const resultado = await reporte.ejecutar(operador, { meses: 2, cuentaBancariaId: 'cb-9', beneficiario: 'Ana' });

    expect(resultado.mesesDeAntiguedad).toBe(2);
    expect(consultas.consultadas).toEqual([
      { fechaDeCorte: '2026-07-29', cuentaBancariaId: 'cb-9', beneficiario: 'Ana' },
    ]);
  });

  it('no entra lo que no es anterior al corte y sin cheques los totales son cero', async () => {
    const { reporte } = armar([cheque({ fecha: '2026-02-28' })]);

    const resultado = await reporte.ejecutar(operador);

    expect(resultado).toMatchObject({ totalDeCheques: 0, montoTotal: '0.00', cheques: [] });
  });
});
