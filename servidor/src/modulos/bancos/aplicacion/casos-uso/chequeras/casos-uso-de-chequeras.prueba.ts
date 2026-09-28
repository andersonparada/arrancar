import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { ChequeraDemasiadoGrande, CuentaBancariaInactiva, RangoDeChequesTraslapado } from '../../../dominio/errores.js';
import { ChequeraInvalida } from '../../../dominio/chequera.js';
import { MovimientosEnMemoria } from '../../../pruebas/dobles-de-movimientos.js';
import { ChequerasEnMemoria } from '../../../pruebas/dobles-de-chequeras.js';
import { ChequesEnMemoria, LimiteDeChequeraFijo } from '../../../pruebas/dobles-de-cheques.js';
import type { SolicitudDeChequera } from '../../dto/chequera.dto.js';
import { CambiarEstadoDeChequera } from './cambiar-estado-de-chequera.js';
import { CrearChequera } from './crear-chequera.js';
import { ListarChequeras } from './listar-chequeras.js';
import { ListarChequerasDeLaEmpresa } from './listar-chequeras-de-la-empresa.js';

const operador = operadorDePrueba();
const CUENTA = '00000000-0000-4000-8000-000000000001';
const OTRA_CUENTA = '00000000-0000-4000-8000-000000000002';

const solicitud = (cambios: Partial<SolicitudDeChequera> = {}): SolicitudDeChequera => ({
  cuentaBancariaId: CUENTA,
  serie: null,
  desde: 1,
  hasta: 50,
  ...cambios,
});

let movimientos: MovimientosEnMemoria;
let cheques: ChequesEnMemoria;
let chequeras: ChequerasEnMemoria;
let auditoria: AuditoriaEnMemoria;

async function casosDeUso({ maximo = 5000 } = {}) {
  movimientos = new MovimientosEnMemoria();
  cheques = new ChequesEnMemoria();
  chequeras = new ChequerasEnMemoria(cheques);
  cheques.vincularChequeras(chequeras);
  auditoria = new AuditoriaEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: chequeras,
    repositorioCheques: cheques,
    consultas: chequeras,
    consultasMovimientos: movimientos,
    limiteDeChequera: new LimiteDeChequeraFijo(maximo),
    auditoria,
  };
  return {
    crear: new CrearChequera(dependencias),
    cambiarEstado: new CambiarEstadoDeChequera(dependencias),
    listar: new ListarChequeras(dependencias),
    listarTodas: new ListarChequerasDeLaEmpresa(dependencias),
  };
}

let casos: Awaited<ReturnType<typeof casosDeUso>>;

beforeEach(async () => {
  casos = await casosDeUso();
});

describe('crear', () => {
  it('crea la chequera con todos sus cheques disponibles', async () => {
    const creada = await casos.crear.ejecutar(operador, solicitud({ desde: 1, hasta: 10 }));

    expect(creada).toMatchObject({ desde: 1, hasta: 10, activa: true, disponibles: 10, emitidos: 0, anulados: 0 });
    const listadas = await chequeras.listarDeLaCuenta(CUENTA);
    expect(listadas).toHaveLength(1);
  });

  it('no acepta un rango inválido (hasta menor que desde)', async () => {
    await expect(casos.crear.ejecutar(operador, solicitud({ desde: 10, hasta: 5 }))).rejects.toThrow(ChequeraInvalida);
  });

  it('no acepta más cheques que el máximo configurado', async () => {
    casos = await casosDeUso({ maximo: 10 });

    await expect(casos.crear.ejecutar(operador, solicitud({ desde: 1, hasta: 11 }))).rejects.toThrow(
      ChequeraDemasiadoGrande,
    );
  });

  it('no acepta un rango que se traslape con otra de la misma cuenta y serie', async () => {
    await casos.crear.ejecutar(operador, solicitud({ desde: 1, hasta: 50 }));

    await expect(casos.crear.ejecutar(operador, solicitud({ desde: 40, hasta: 60 }))).rejects.toThrow(
      RangoDeChequesTraslapado,
    );
  });

  it('permite el mismo rango de números en una serie distinta', async () => {
    await casos.crear.ejecutar(operador, solicitud({ serie: 'A', desde: 1, hasta: 50 }));

    const creada = await casos.crear.ejecutar(operador, solicitud({ serie: 'B', desde: 1, hasta: 50 }));

    expect(creada.serie).toBe('B');
  });

  it('no crea la chequera si la cuenta está inactiva', async () => {
    movimientos.cuentasInactivas.add(CUENTA);

    await expect(casos.crear.ejecutar(operador, solicitud())).rejects.toThrow(CuentaBancariaInactiva);
  });
});

describe('cambiar estado', () => {
  it('inactiva y audita', async () => {
    const creada = await casos.crear.ejecutar(operador, solicitud());

    const inactivada = await casos.cambiarEstado.ejecutar(operador, { chequeraId: creada.id, activa: false });

    expect(inactivada.activa).toBe(false);
    expect(auditoria.entradas).toContainEqual(
      expect.objectContaining({ recurso: 'bancos.chequeras', registroId: creada.id, accion: 'inactivar' }),
    );
  });

  it('reactiva y audita', async () => {
    const creada = await casos.crear.ejecutar(operador, solicitud());
    await casos.cambiarEstado.ejecutar(operador, { chequeraId: creada.id, activa: false });

    const reactivada = await casos.cambiarEstado.ejecutar(operador, { chequeraId: creada.id, activa: true });

    expect(reactivada.activa).toBe(true);
    expect(auditoria.entradas).toContainEqual(
      expect.objectContaining({ recurso: 'bancos.chequeras', registroId: creada.id, accion: 'reactivar' }),
    );
  });

  it('avisa si no existe', async () => {
    await expect(casos.cambiarEstado.ejecutar(operador, { chequeraId: randomUUID(), activa: false })).rejects.toThrow(
      RecursoNoEncontrado,
    );
  });
});

describe('listar todas', () => {
  it('trae las chequeras de todas las cuentas, ordenadas por cuenta, serie y desde', async () => {
    chequeras.nombrarCuenta(CUENTA, 'Cuenta B');
    chequeras.nombrarCuenta(OTRA_CUENTA, 'Cuenta A');
    await casos.crear.ejecutar(operador, solicitud({ desde: 1, hasta: 10 }));
    await casos.crear.ejecutar(operador, solicitud({ cuentaBancariaId: OTRA_CUENTA, desde: 1, hasta: 5 }));

    const todas = await casos.listarTodas.ejecutar(operador, {});

    expect(todas.map((c) => c.cuentaBancariaNombre)).toEqual(['Cuenta A', 'Cuenta B']);
  });

  it('filtra por cuenta', async () => {
    await casos.crear.ejecutar(operador, solicitud({ desde: 1, hasta: 10 }));
    await casos.crear.ejecutar(operador, solicitud({ cuentaBancariaId: OTRA_CUENTA, desde: 1, hasta: 5 }));

    const deLaCuenta = await casos.listarTodas.ejecutar(operador, { cuentaBancariaId: OTRA_CUENTA });

    expect(deLaCuenta).toHaveLength(1);
    expect(deLaCuenta[0]?.cuentaBancariaId).toBe(OTRA_CUENTA);
  });
});
