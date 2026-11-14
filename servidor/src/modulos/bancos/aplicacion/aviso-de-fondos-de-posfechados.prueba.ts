import { beforeEach, describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { RelojFijo, operadorDePrueba } from '../../core/compartido/pruebas/dobles-compartidos.js';
import { Movimiento } from '../dominio/movimiento.js';
import { CONCEPTO_GENERAL } from '../pruebas/conceptos-de-prueba.js';
import { MovimientosEnMemoria } from '../pruebas/dobles-de-movimientos.js';
import { AvisoDeFondosDePosfechados, CODIGO_DE_POSFECHADO_SIN_FONDOS } from './aviso-de-fondos-de-posfechados.js';

const operador = operadorDePrueba();
const CUENTA = '00000000-0000-4000-8000-000000000001';
const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
let movimientos: MovimientosEnMemoria;
let aviso: AvisoDeFondosDePosfechados;

interface DatosDelMovimiento {
  tipo: 'credito' | 'cheque';
  fecha: string;
  monto: string;
  saldoInicial?: boolean;
}

const nuevo = ({ tipo, fecha, monto, saldoInicial = false }: DatosDelMovimiento) =>
  Movimiento.crear(empresaId, {
    cuentaBancariaId: CUENTA,
    tipo,
    fecha,
    monto,
    saldoInicial,
    referencia: null,
    beneficiario: null,
    observaciones: null,
    conceptoId: CONCEPTO_GENERAL,
  });
const agregar = (datos: DatosDelMovimiento) => movimientos.agregar(nuevo(datos));
const revisar = (fecha: string, monto: string) => aviso.avisos(operador, { cuentaBancariaId: CUENTA, fecha, monto });

beforeEach(async () => {
  movimientos = new MovimientosEnMemoria();
  aviso = new AvisoDeFondosDePosfechados({ consultas: movimientos, reloj: new RelojFijo('2026-09-29') });
  await agregar({ tipo: 'credito', fecha: '2026-01-01', monto: '1000.00', saldoInicial: true });
});

describe('AvisoDeFondosDePosfechados', () => {
  it('un cheque con fecha de hoy o anterior no avisa, aunque no haya fondos', async () => {
    expect(await revisar('2026-09-29', '5000.00')).toEqual([]);
    expect(await revisar('2026-09-01', '5000.00')).toEqual([]);
  });

  it('un posfechado cubierto por el saldo de hoy no avisa; uno que lo excede sí, con el texto del contador', async () => {
    expect(await revisar('2026-10-15', '1000.00')).toEqual([]);

    const avisos = await revisar('2026-10-15', '1000.01');

    expect(avisos).toEqual([expect.objectContaining({ codigo: CODIGO_DE_POSFECHADO_SIN_FONDOS })]);
    expect(avisos[0]!.mensaje).toMatch(/art\. 501.*art\. 268/);
  });

  it('descuenta los cheques posfechados vigentes de la cuenta, no los anulados', async () => {
    await agregar({ tipo: 'cheque', fecha: '2026-10-20', monto: '700.00' });
    const anulado = nuevo({ tipo: 'cheque', fecha: '2026-10-21', monto: '200.00' });
    anulado.anularPorCheque('No se entregó');
    await movimientos.agregar(anulado);

    expect(await revisar('2026-10-25', '300.00')).toEqual([]);
    expect(await revisar('2026-10-25', '300.01')).toHaveLength(1);
  });

  it('un depósito posfechado no cuenta como saldo de hoy', async () => {
    await agregar({ tipo: 'credito', fecha: '2026-12-01', monto: '5000.00' });

    expect(await revisar('2026-10-15', '2000.00')).toHaveLength(1);
  });
});
