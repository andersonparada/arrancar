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
  MovimientoDeTransferencia,
  SaldoInsuficiente,
  TransferenciaALaMismaCuenta,
  TransferenciaAnulada,
} from '../../../dominio/errores.js';
import { MovimientosEnMemoria, PoliticaDeSobregiroFija } from '../../../pruebas/dobles-de-movimientos.js';
import { NombresDeCuentaEnMemoria, TransferenciasEnMemoria } from '../../../pruebas/dobles-de-transferencias.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Movimiento } from '../../../dominio/movimiento.js';
import type { SolicitudDeTransferencia } from '../../dto/transferencia.dto.js';
import { ReglasDeLaCuenta } from '../../reglas-de-la-cuenta.js';
import { ActualizarMovimiento } from '../movimientos/actualizar-movimiento.js';
import { AnularMovimiento } from '../movimientos/anular-movimiento.js';
import { AnularTransferencia } from './anular-transferencia.js';
import { ListarTransferencias } from './listar-transferencias.js';
import { ObtenerTransferencia } from './obtener-transferencia.js';
import { RegistrarTransferencia } from './registrar-transferencia.js';

const operador = operadorDePrueba();
const ORIGEN = '00000000-0000-4000-8000-000000000001';
const DESTINO = '00000000-0000-4000-8000-000000000002';

const solicitud = (cambios: Partial<SolicitudDeTransferencia> = {}): SolicitudDeTransferencia => ({
  cuentaOrigenId: ORIGEN,
  cuentaDestinoId: DESTINO,
  fecha: '2026-01-15',
  monto: '100.00',
  referencia: 'Boleta 123',
  observaciones: null,
  ...cambios,
});

let movimientos: MovimientosEnMemoria;
let transferencias: TransferenciasEnMemoria;
let auditoria: AuditoriaEnMemoria;

/** El origen arranca con saldo, como en la vida real, para poder debitarlo. */
async function conSaldoInicial(destino: MovimientosEnMemoria): Promise<void> {
  const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
  await destino.agregar(
    Movimiento.crear(empresaId, {
      cuentaBancariaId: ORIGEN,
      tipo: 'credito',
      fecha: '2026-01-01',
      monto: '1000.00',
      saldoInicial: true,
      referencia: null,
      beneficiario: null,
      observaciones: null,
    }),
  );
}

async function casosDeUso({ permiteSobregiro = false } = {}) {
  movimientos = new MovimientosEnMemoria();
  await conSaldoInicial(movimientos);
  const nombres = new Map([
    [ORIGEN, 'Cuenta origen'],
    [DESTINO, 'Cuenta destino'],
  ]);
  transferencias = new TransferenciasEnMemoria(movimientos, nombres);
  auditoria = new AuditoriaEnMemoria();
  const politicaDeSobregiro = new PoliticaDeSobregiroFija(permiteSobregiro);
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: transferencias,
    repositorioMovimientos: movimientos,
    consultas: transferencias,
    consultasMovimientos: movimientos,
    consultasCuentasBancarias: new NombresDeCuentaEnMemoria(nombres),
    auditoria,
    reglas: new ReglasDeLaCuenta({ consultas: movimientos, politicaDeSobregiro }),
  };
  const dependenciasDeMovimientos = {
    unidadDeTrabajo: dependencias.unidadDeTrabajo,
    repositorio: movimientos,
    consultas: movimientos,
    reglas: dependencias.reglas,
    auditoria,
  };
  return {
    registrar: new RegistrarTransferencia(dependencias),
    obtener: new ObtenerTransferencia(dependencias),
    anular: new AnularTransferencia(dependencias),
    listar: new ListarTransferencias(dependencias),
    actualizarMovimiento: new ActualizarMovimiento(dependenciasDeMovimientos),
    anularMovimiento: new AnularMovimiento(dependenciasDeMovimientos),
  };
}

let casos: Awaited<ReturnType<typeof casosDeUso>>;

beforeEach(async () => {
  casos = await casosDeUso();
});

describe('registrar', () => {
  it('crea el débito en el origen y el crédito en el destino, con la misma fecha y monto', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());

    const notas = await movimientos.listar({});
    const debito = notas.find((n) => n.id === registrada.movimientoOrigenId)!;
    const credito = notas.find((n) => n.id === registrada.movimientoDestinoId)!;

    expect(debito).toMatchObject({
      cuentaBancariaId: ORIGEN,
      tipo: 'debito',
      monto: '100.00',
      fecha: '2026-01-15',
      beneficiario: 'Transferencia a Cuenta destino',
      transferenciaId: registrada.id,
    });
    expect(credito).toMatchObject({
      cuentaBancariaId: DESTINO,
      tipo: 'credito',
      monto: '100.00',
      fecha: '2026-01-15',
      beneficiario: 'Transferencia desde Cuenta origen',
      transferenciaId: registrada.id,
    });
    expect(registrada.cuentaOrigenNombre).toBe('Cuenta origen');
    expect(registrada.cuentaDestinoNombre).toBe('Cuenta destino');
  });

  it('no acepta la misma cuenta como origen y destino', async () => {
    await expect(casos.registrar.ejecutar(operador, solicitud({ cuentaDestinoId: ORIGEN }))).rejects.toThrow(
      TransferenciaALaMismaCuenta,
    );
  });

  it('no registra si alguna cuenta está inactiva', async () => {
    movimientos.cuentasInactivas.add(DESTINO);

    await expect(casos.registrar.ejecutar(operador, solicitud())).rejects.toThrow(CuentaBancariaInactiva);
  });

  it('revisa el sobregiro del origen', async () => {
    await expect(casos.registrar.ejecutar(operador, solicitud({ monto: '1000.01' }))).rejects.toThrow(
      SaldoInsuficiente,
    );
  });

  it('una nota de transferencia no se corrige ni se anula suelta', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());

    await expect(
      casos.actualizarMovimiento.ejecutar(operador, {
        movimientoId: registrada.movimientoOrigenId,
        solicitud: {
          cuentaBancariaId: ORIGEN,
          tipo: 'debito',
          fecha: '2026-01-15',
          monto: '100.00',
          saldoInicial: false,
          referencia: null,
          beneficiario: null,
          observaciones: null,
        },
        esSaldoInicial: false,
      }),
    ).rejects.toThrow(MovimientoDeTransferencia);
    await expect(
      casos.anularMovimiento.ejecutar(operador, {
        movimientoId: registrada.movimientoDestinoId,
        motivo: 'Error',
        esSaldoInicial: false,
      }),
    ).rejects.toThrow(MovimientoDeTransferencia);
  });
});

describe('anular', () => {
  it('anula la transferencia y sus dos notas, y lo deja en la auditoría', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());

    const anulada = await casos.anular.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'Duplicada' });

    expect(anulada.anuladaEn).toEqual(expect.any(String));
    expect(await movimientos.saldoDe(ORIGEN)).toBe('1000.00');
    expect(await movimientos.saldoDe(DESTINO)).toBe('0.00');
    expect(auditoria.entradas).toContainEqual(
      expect.objectContaining({ recurso: 'bancos.transferencias', registroId: registrada.id, accion: 'anular' }),
    );
  });

  it('no se anula dos veces', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());
    await casos.anular.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'Error' });

    await expect(
      casos.anular.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'Otra vez' }),
    ).rejects.toThrow(TransferenciaAnulada);
  });

  it('si el destino queda negativo sin sobregiro, no se anula', async () => {
    const registrada = await casos.registrar.ejecutar(operador, solicitud());
    const salidaEnElDestino = Movimiento.crear(Identificador.desde(operador.empresaId), {
      cuentaBancariaId: DESTINO,
      tipo: 'debito',
      fecha: '2026-01-16',
      monto: '80.00',
      saldoInicial: false,
      referencia: null,
      beneficiario: null,
      observaciones: null,
    });
    await movimientos.agregar(salidaEnElDestino);

    await expect(casos.anular.ejecutar(operador, { transferenciaId: registrada.id, motivo: 'Error' })).rejects.toThrow(
      SaldoInsuficiente,
    );
  });

  it('avisa si no existe', async () => {
    await expect(casos.obtener.ejecutar(operador, randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });
});

describe('listar', () => {
  it('de la más reciente a la más antigua, incluidas las anuladas', async () => {
    const primera = await casos.registrar.ejecutar(operador, solicitud({ fecha: '2026-01-10' }));
    const segunda = await casos.registrar.ejecutar(operador, solicitud({ fecha: '2026-01-20' }));
    await casos.anular.ejecutar(operador, { transferenciaId: primera.id, motivo: 'Error' });

    const listado = await casos.listar.ejecutar(operador, {});

    expect(listado.map((t) => t.id)).toEqual([segunda.id, primera.id]);
    expect(listado.find((t) => t.id === primera.id)?.anuladaEn).toEqual(expect.any(String));
  });

  it('la cuenta filtra si es origen o destino de la transferencia', async () => {
    await casos.registrar.ejecutar(operador, solicitud());

    expect(await casos.listar.ejecutar(operador, { cuentaBancariaId: ORIGEN })).toHaveLength(1);
    expect(await casos.listar.ejecutar(operador, { cuentaBancariaId: DESTINO })).toHaveLength(1);
    expect(await casos.listar.ejecutar(operador, { cuentaBancariaId: randomUUID() })).toHaveLength(0);
  });
});
