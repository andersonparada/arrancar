import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import {
  CuentaBancariaInactiva,
  MovimientoAnulado,
  MovimientoAntesDelSaldoInicial,
  SaldoInicialNoEsElPrimero,
  SaldoInicialRepetido,
  SaldoInsuficiente,
} from '../../../dominio/errores.js';
import { MovimientosEnMemoria, PoliticaDeSobregiroFija } from '../../../pruebas/dobles-de-movimientos.js';
import type { SolicitudDeMovimiento } from '../../dto/movimiento.dto.js';
import { ReglasDeLaCuenta } from '../../reglas-de-la-cuenta.js';
import { ActualizarMovimiento } from './actualizar-movimiento.js';
import { AnularMovimiento } from './anular-movimiento.js';
import { CrearMovimiento } from './crear-movimiento.js';
import { ListarMovimientos } from './listar-movimientos.js';
import { ObtenerMovimiento } from './obtener-movimiento.js';

const operador = operadorDePrueba();
const CUENTA = '00000000-0000-4000-8000-000000000001';

const nota = (cambios: Partial<SolicitudDeMovimiento> = {}): SolicitudDeMovimiento => ({
  cuentaBancariaId: CUENTA,
  tipo: 'credito',
  fecha: '2026-01-15',
  monto: '100.00',
  saldoInicial: false,
  referencia: 'Boleta 123',
  beneficiario: null,
  observaciones: null,
  ...cambios,
});

let registros: MovimientosEnMemoria;
let auditoria: AuditoriaEnMemoria;

function casosDeUso({ permiteSobregiro = false } = {}) {
  registros = new MovimientosEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  const politicaDeSobregiro = new PoliticaDeSobregiroFija(permiteSobregiro);
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: registros,
    consultas: registros,
    auditoria,
    reglas: new ReglasDeLaCuenta({ consultas: registros, politicaDeSobregiro }),
  };
  return {
    listar: new ListarMovimientos(dependencias),
    obtener: new ObtenerMovimiento(dependencias),
    crear: new CrearMovimiento(dependencias),
    actualizar: new ActualizarMovimiento(dependencias),
    anular: new AnularMovimiento(dependencias),
  };
}

let casos: ReturnType<typeof casosDeUso>;

beforeEach(() => {
  casos = casosDeUso();
});

describe('registrar y corregir', () => {
  it('registra, lista filtrando por fechas y corrige sin cambiar de cuenta', async () => {
    const creado = await casos.crear.ejecutar(operador, nota());
    await casos.crear.ejecutar(operador, nota({ fecha: '2026-03-01' }));

    const corregido = await casos.actualizar.ejecutar(operador, {
      movimientoId: creado.id,
      solicitud: nota({ referencia: 'Boleta 124', cuentaBancariaId: randomUUID() }),
    });

    expect(await casos.listar.ejecutar(operador, { hasta: '2026-01-31' })).toEqual([corregido]);
    expect(corregido).toMatchObject({ referencia: 'Boleta 124', cuentaBancariaId: CUENTA });
  });

  it('no registra en una cuenta inactiva', async () => {
    registros.cuentasInactivas.add(CUENTA);

    await expect(casos.crear.ejecutar(operador, nota())).rejects.toThrow(CuentaBancariaInactiva);
  });

  it('avisa si no existe o es de otra empresa', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });
});

describe('saldo inicial', () => {
  it('hay uno solo por cuenta y es el primero por fecha', async () => {
    await casos.crear.ejecutar(operador, nota({ saldoInicial: true, fecha: '2026-01-01' }));

    await expect(casos.crear.ejecutar(operador, nota({ saldoInicial: true }))).rejects.toThrow(SaldoInicialRepetido);
    await expect(casos.crear.ejecutar(operador, nota({ fecha: '2025-12-31' }))).rejects.toThrow(
      MovimientoAntesDelSaldoInicial,
    );
  });

  it('no puede quedar después de otro movimiento', async () => {
    await casos.crear.ejecutar(operador, nota({ fecha: '2026-01-10' }));

    await expect(casos.crear.ejecutar(operador, nota({ saldoInicial: true, fecha: '2026-02-01' }))).rejects.toThrow(
      SaldoInicialNoEsElPrimero,
    );
  });

  it('se puede corregir a sí mismo sin chocar consigo', async () => {
    const inicial = await casos.crear.ejecutar(operador, nota({ saldoInicial: true, fecha: '2026-01-01' }));

    const corregido = await casos.actualizar.ejecutar(operador, {
      movimientoId: inicial.id,
      solicitud: nota({ saldoInicial: true, fecha: '2025-12-31', monto: '250.00' }),
    });

    expect(corregido.monto).toBe('250.00');
  });
});

describe('sobregiro', () => {
  it('sin permitirlo, un débito no deja el saldo negativo', async () => {
    await casos.crear.ejecutar(operador, nota({ monto: '100.10' }));
    await casos.crear.ejecutar(operador, nota({ tipo: 'debito', monto: '100.10' }));

    await expect(casos.crear.ejecutar(operador, nota({ tipo: 'debito', monto: '0.01' }))).rejects.toThrow('Q -0.01');
  });

  it('al corregir cuenta solo la diferencia', async () => {
    await casos.crear.ejecutar(operador, nota({ monto: '100.00' }));
    const debito = await casos.crear.ejecutar(operador, nota({ tipo: 'debito', monto: '60.00' }));

    const corregido = await casos.actualizar.ejecutar(operador, {
      movimientoId: debito.id,
      solicitud: nota({ tipo: 'debito', monto: '100.00' }),
    });

    expect(corregido.monto).toBe('100.00');
    await expect(
      casos.actualizar.ejecutar(operador, {
        movimientoId: debito.id,
        solicitud: nota({ tipo: 'debito', monto: '100.01' }),
      }),
    ).rejects.toThrow(SaldoInsuficiente);
  });

  it('anular un crédito también cuenta', async () => {
    const credito = await casos.crear.ejecutar(operador, nota());
    await casos.crear.ejecutar(operador, nota({ tipo: 'debito', monto: '50.00' }));

    await expect(casos.anular.ejecutar(operador, { movimientoId: credito.id, motivo: 'Error' })).rejects.toThrow(
      SaldoInsuficiente,
    );
  });

  it('si la empresa lo permite, el saldo puede quedar negativo', async () => {
    casos = casosDeUso({ permiteSobregiro: true });

    const debito = await casos.crear.ejecutar(operador, nota({ tipo: 'debito' }));

    expect(debito.tipo).toBe('debito');
    expect(await registros.saldoDe(CUENTA)).toBe('-100.00');
  });
});

describe('anular', () => {
  it('guarda el motivo, lo deja en la auditoría y ya no se corrige', async () => {
    const creado = await casos.crear.ejecutar(operador, nota());

    const anulado = await casos.anular.ejecutar(operador, { movimientoId: creado.id, motivo: '  Boleta duplicada ' });

    expect(anulado).toMatchObject({ anuladoEn: expect.any(String), motivoDeAnulacion: 'Boleta duplicada' });
    expect(auditoria.entradas).toContainEqual(
      expect.objectContaining({
        registroId: creado.id,
        accion: 'anular',
        anterior: creado,
        motivo: 'Boleta duplicada',
      }),
    );
    expect(await registros.saldoDe(CUENTA)).toBe('0.00');
    await expect(casos.actualizar.ejecutar(operador, { movimientoId: creado.id, solicitud: nota() })).rejects.toThrow(
      MovimientoAnulado,
    );
  });
});
