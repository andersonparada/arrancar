import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import {
  BeneficiarioObligatorio,
  ChequeAnulado,
  ChequeNoDisponible,
  MovimientoDeCheque,
  SaldoInsuficiente,
} from '../../../dominio/errores.js';
import { Movimiento } from '../../../dominio/movimiento.js';
import { ChequerasEnMemoria } from '../../../pruebas/dobles-de-chequeras.js';
import { ChequesEnMemoria, LimiteDeChequeraFijo } from '../../../pruebas/dobles-de-cheques.js';
import { MovimientosEnMemoria, PoliticaDeSobregiroFija } from '../../../pruebas/dobles-de-movimientos.js';
import { ReglasDeLaCuenta } from '../../reglas-de-la-cuenta.js';
import { ActualizarMovimiento } from '../movimientos/actualizar-movimiento.js';
import { AnularMovimiento } from '../movimientos/anular-movimiento.js';
import { CrearChequera } from '../chequeras/crear-chequera.js';
import { AnularCheque } from './anular-cheque.js';
import { EmitirCheque } from './emitir-cheque.js';
import { SiguienteChequeDisponible } from './siguiente-cheque-disponible.js';

const operador = operadorDePrueba();
const CUENTA = '00000000-0000-4000-8000-000000000001';

let movimientos: MovimientosEnMemoria;
let cheques: ChequesEnMemoria;
let chequeras: ChequerasEnMemoria;
let auditoria: AuditoriaEnMemoria;

/** El origen arranca con saldo, como en la vida real, para poder debitarlo. */
async function conSaldoInicial(): Promise<void> {
  const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
  await movimientos.agregar(
    Movimiento.crear(empresaId, {
      cuentaBancariaId: CUENTA,
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
  await conSaldoInicial();
  cheques = new ChequesEnMemoria();
  chequeras = new ChequerasEnMemoria(cheques);
  cheques.vincularChequeras(chequeras);
  auditoria = new AuditoriaEnMemoria();
  const politicaDeSobregiro = new PoliticaDeSobregiroFija(permiteSobregiro);
  const reglas = new ReglasDeLaCuenta({ consultas: movimientos, politicaDeSobregiro });
  const dependenciasDeChequeras = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: chequeras,
    repositorioCheques: cheques,
    consultas: chequeras,
    consultasMovimientos: movimientos,
    limiteDeChequera: new LimiteDeChequeraFijo(5000),
    auditoria,
  };
  const dependenciasDeCheques = {
    unidadDeTrabajo: dependenciasDeChequeras.unidadDeTrabajo,
    repositorio: cheques,
    repositorioChequeras: chequeras,
    repositorioMovimientos: movimientos,
    consultas: cheques,
    consultasMovimientos: movimientos,
    reglas,
    auditoria,
  };
  const dependenciasDeMovimientos = {
    unidadDeTrabajo: dependenciasDeChequeras.unidadDeTrabajo,
    repositorio: movimientos,
    consultas: movimientos,
    reglas,
    auditoria,
  };
  const crearChequera = new CrearChequera(dependenciasDeChequeras);
  const chequera = await crearChequera.ejecutar(operador, {
    cuentaBancariaId: CUENTA,
    serie: null,
    desde: 1,
    hasta: 5,
  });
  const primerCheque = (await cheques.listarDeLaChequera(chequera.id))[0]!;
  return {
    chequeraId: chequera.id,
    chequeId: primerCheque.id,
    emitir: new EmitirCheque(dependenciasDeCheques),
    anular: new AnularCheque(dependenciasDeCheques),
    siguiente: new SiguienteChequeDisponible(dependenciasDeCheques),
    actualizarMovimiento: new ActualizarMovimiento(dependenciasDeMovimientos),
    anularMovimiento: new AnularMovimiento(dependenciasDeMovimientos),
  };
}

let casos: Awaited<ReturnType<typeof casosDeUso>>;

beforeEach(async () => {
  casos = await casosDeUso();
});

const emision = (cambios: Record<string, unknown> = {}) => ({
  chequeId: casos.chequeId,
  fecha: '2026-02-01',
  monto: '100.00',
  beneficiario: 'Proveedor S.A.',
  noNegociable: true,
  referencia: null,
  observaciones: null,
  ...cambios,
});

describe('siguiente disponible', () => {
  it('es el primer número del rango recién creado', async () => {
    const siguiente = await casos.siguiente.ejecutar(operador, CUENTA);

    expect(siguiente?.numero).toBe(1);
  });

  it('es null si no hay chequeras activas con cheques disponibles', async () => {
    const otraCuenta = '00000000-0000-4000-8000-000000000009';

    const siguiente = await casos.siguiente.ejecutar(operador, otraCuenta);

    expect(siguiente).toBeNull();
  });
});

describe('emitir', () => {
  it('crea el movimiento tipo cheque y marca el cheque emitido', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emision());

    expect(movimiento).toMatchObject({
      cuentaBancariaId: CUENTA,
      tipo: 'cheque',
      monto: '100.00',
      beneficiario: 'Proveedor S.A.',
    });
    expect(await movimientos.saldoDe(CUENTA)).toBe('900.00');
    const siguiente = await casos.siguiente.ejecutar(operador, CUENTA);
    expect(siguiente?.numero).toBe(2);
  });

  it('usa "Cheque <número>" como referencia si no se escribió una', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emision({ referencia: null }));

    expect(movimiento.referencia).toBe('Cheque 1');
  });

  it('exige el beneficiario', async () => {
    await expect(casos.emitir.ejecutar(operador, emision({ beneficiario: '  ' }))).rejects.toThrow(
      BeneficiarioObligatorio,
    );
  });

  it('no se emite un cheque que ya no está disponible', async () => {
    await casos.emitir.ejecutar(operador, emision());

    await expect(casos.emitir.ejecutar(operador, emision())).rejects.toThrow(ChequeNoDisponible);
  });

  it('revisa el sobregiro de la cuenta', async () => {
    await expect(casos.emitir.ejecutar(operador, emision({ monto: '1000.01' }))).rejects.toThrow(SaldoInsuficiente);
  });

  it('un movimiento de cheque no se corrige ni se anula suelto', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emision());

    await expect(
      casos.actualizarMovimiento.ejecutar(operador, {
        movimientoId: movimiento.id,
        solicitud: {
          cuentaBancariaId: CUENTA,
          tipo: 'debito',
          fecha: '2026-02-01',
          monto: '100.00',
          saldoInicial: false,
          referencia: null,
          beneficiario: null,
          observaciones: null,
        },
      }),
    ).rejects.toThrow(MovimientoDeCheque);
    await expect(
      casos.anularMovimiento.ejecutar(operador, { movimientoId: movimiento.id, motivo: 'Error' }),
    ).rejects.toThrow(MovimientoDeCheque);
  });
});

describe('anular', () => {
  it('anula un cheque disponible sin tocar movimientos', async () => {
    const anulado = await casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Roto' });

    expect(anulado.estado).toBe('anulado');
    expect(await movimientos.saldoDe(CUENTA)).toBe('1000.00');
    expect(auditoria.entradas).toContainEqual(
      expect.objectContaining({ recurso: 'bancos.cheques', registroId: casos.chequeId, accion: 'anular' }),
    );
  });

  it('anula un cheque emitido y también su movimiento', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emision());

    const anulado = await casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Error' });

    expect(anulado.estado).toBe('anulado');
    expect(await movimientos.saldoDe(CUENTA)).toBe('1000.00');
    const notaAnulada = await movimientos.obtener(movimiento.id);
    expect(notaAnulada.anuladoEn).toEqual(expect.any(String));
  });

  it('no se anula dos veces', async () => {
    await casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Roto' });

    await expect(casos.anular.ejecutar(operador, { chequeId: casos.chequeId, motivo: 'Otra vez' })).rejects.toThrow(
      ChequeAnulado,
    );
  });

  it('avisa si no existe', async () => {
    await expect(casos.anular.ejecutar(operador, { chequeId: randomUUID(), motivo: 'Error' })).rejects.toThrow(
      RecursoNoEncontrado,
    );
  });
});
