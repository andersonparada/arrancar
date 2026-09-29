import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AutorizaQuienElaboro,
  ConciliacionFueraDeOrden,
  ConciliacionNoEstaElaborada,
  ConciliacionNoEstaEnProceso,
  HayUnaConciliacionAbierta,
  MesNoHaTerminado,
  MovimientoNoConciliable,
} from '../../../dominio/errores.js';
import type { AuditoriaEnMemoria } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import {
  agregarMovimiento,
  casosDeUsoDeConciliaciones,
  conciliarYAutorizar,
  inicio,
  operador,
  otroOperador,
} from './soporte-de-pruebas-de-conciliaciones.js';

let entorno: ReturnType<typeof casosDeUsoDeConciliaciones>;
let auditoria: AuditoriaEnMemoria;

beforeEach(async () => {
  entorno = casosDeUsoDeConciliaciones();
  auditoria = entorno.auditoria;
  await agregarMovimiento(entorno.movimientos, { fecha: '2026-01-01', monto: '1000.00', saldoInicial: true });
});

describe('iniciar', () => {
  it('la primera puede ser de cualquier mes ya terminado', async () => {
    const conciliacion = await entorno.casos.iniciar.ejecutar(operador, inicio({ mes: 3 }));
    expect(conciliacion).toMatchObject({ anio: 2026, mes: 3, estado: 'en_proceso' });
  });

  it('no se concilia un mes que todavía no ha terminado', async () => {
    await expect(entorno.casos.iniciar.ejecutar(operador, inicio({ anio: 2026, mes: 12 }))).rejects.toThrow(
      MesNoHaTerminado,
    );
  });

  it('la siguiente debe ser exactamente el mes siguiente a la última autorizada', async () => {
    await conciliarYAutorizar(entorno, 1);

    await expect(entorno.casos.iniciar.ejecutar(operador, inicio({ mes: 3 }))).rejects.toThrow(
      ConciliacionFueraDeOrden,
    );
    const segunda = await entorno.casos.iniciar.ejecutar(operador, inicio({ mes: 2 }));
    expect(segunda.mes).toBe(2);
  });

  it('no se inicia otra mientras la última no esté autorizada (en proceso o elaborada)', async () => {
    const primera = await entorno.casos.iniciar.ejecutar(operador, inicio());
    await expect(entorno.casos.iniciar.ejecutar(operador, inicio({ mes: 2 }))).rejects.toThrow(
      HayUnaConciliacionAbierta,
    );

    await entorno.casos.terminar.ejecutar(operador, primera.id);
    await expect(entorno.casos.iniciar.ejecutar(operador, inicio({ mes: 2 }))).rejects.toThrow(
      HayUnaConciliacionAbierta,
    );
  });
});

describe('marcar: candidatos, partidas y saldo calculado', () => {
  it('incluye pendientes de meses anteriores y excluye los marcados en otra conciliación', async () => {
    await agregarMovimiento(entorno.movimientos, { fecha: '2026-01-15', monto: '200.00' });
    await conciliarYAutorizar(entorno, 1); // No se marca nada: todo queda pendiente para febrero.

    const febrero = await entorno.casos.iniciar.ejecutar(operador, inicio({ mes: 2 }));

    expect(febrero.candidatos.map((m) => m.monto).sort()).toEqual(['1000.00', '200.00']);
  });

  it('un cheque sin cobrar y un depósito en tránsito quedan como partidas y arman el saldo calculado', async () => {
    await agregarMovimiento(entorno.movimientos, {
      fecha: '2026-01-10',
      monto: '300.00',
      tipo: 'cheque',
      beneficiario: 'Ferretería',
    });
    const idDeposito = await agregarMovimiento(entorno.movimientos, { fecha: '2026-01-20', monto: '150.00' });
    const conciliacion = await entorno.casos.iniciar.ejecutar(operador, inicio());
    const idSaldoInicial = conciliacion.candidatos.find((m) => m.saldoInicial)!.id;

    // Se marcan el saldo inicial y el depósito; el cheque queda pendiente.
    const marcado = await entorno.casos.marcar.ejecutar(operador, {
      conciliacionId: conciliacion.id,
      movimientoIds: [idSaldoInicial, idDeposito],
    });

    expect(marcado.partidas.chequesEnCirculacion).toHaveLength(1);
    expect(marcado.partidas.chequesEnCirculacion[0]).toMatchObject({ monto: '300.00', beneficiario: 'Ferretería' });
    expect(marcado.cuadratica.libros.saldoFinal).toBe('850.00');
    expect(marcado.saldoQueDebeMostrarElEstadoDeCuenta).toBe('1150.00');
    expect(marcado.cuadratica.banco.saldoFinal).toBe('1150.00');
  });

  it('el documento de un mes autorizado no cambia cuando el pendiente se cobra en un mes posterior', async () => {
    await agregarMovimiento(entorno.movimientos, { fecha: '2026-01-10', monto: '300.00', tipo: 'cheque' });
    const enero = await conciliarYAutorizar(entorno, 1, (candidatos) =>
      candidatos.filter((m) => m.saldoInicial).map((m) => m.id),
    );
    const antes = await entorno.casos.obtener.ejecutar(operador, enero);

    // El cheque se cobra en febrero: se marca en la conciliación de febrero.
    await conciliarYAutorizar(entorno, 2, (candidatos) => candidatos.map((m) => m.id));
    const despues = await entorno.casos.obtener.ejecutar(operador, enero);

    expect(antes.partidas.chequesEnCirculacion).toHaveLength(1);
    expect(despues.partidas).toEqual(antes.partidas);
    expect(despues.saldoQueDebeMostrarElEstadoDeCuenta).toBe(antes.saldoQueDebeMostrarElEstadoDeCuenta);
  });

  it('no marca un movimiento que no es candidato (otra cuenta, anulado o fuera del mes)', async () => {
    const conciliacion = await entorno.casos.iniciar.ejecutar(operador, inicio());

    await expect(
      entorno.casos.marcar.ejecutar(operador, { conciliacionId: conciliacion.id, movimientoIds: [randomUUID()] }),
    ).rejects.toThrow(MovimientoNoConciliable);
  });

  it('un original y su inverso que nunca pasaron por el banco se marcan juntos, compensados', async () => {
    const idNota = await agregarMovimiento(entorno.movimientos, { fecha: '2026-01-10', monto: '75.00' });
    await entorno.casos.anularMovimiento.ejecutar(operador, {
      movimientoId: idNota,
      motivo: 'Error',
      fecha: '2026-01-12',
    });
    const conciliacion = await entorno.casos.iniciar.ejecutar(operador, inicio());
    const idSaldoInicial = conciliacion.candidatos.find((m) => m.saldoInicial)!.id;

    const marcado = await entorno.casos.marcar.ejecutar(operador, {
      conciliacionId: conciliacion.id,
      movimientoIds: [idSaldoInicial],
    });

    const marcados = marcado.candidatos.filter((c) => c.marcado);
    expect(marcados.map((c) => c.id)).toEqual(expect.arrayContaining([idNota]));
    expect(marcados).toHaveLength(3); // saldo inicial + la nota revertida + su inverso
    expect(marcado.partidas.otrosDebitosEnTransito).toHaveLength(0);
    expect(marcado.partidas.creditosEnTransito).toHaveLength(0);
  });

  it('no se pueden cambiar las marcas si ya no está en proceso', async () => {
    const conciliacion = await entorno.casos.iniciar.ejecutar(operador, inicio());
    await entorno.casos.terminar.ejecutar(operador, conciliacion.id);

    await expect(
      entorno.casos.marcar.ejecutar(operador, { conciliacionId: conciliacion.id, movimientoIds: [] }),
    ).rejects.toThrow(ConciliacionNoEstaEnProceso);
  });
});

describe('terminar y autorizar', () => {
  it('termina: pasa a elaborada y guarda quién', async () => {
    const conciliacion = await entorno.casos.iniciar.ejecutar(operador, inicio());

    const terminada = await entorno.casos.terminar.ejecutar(operador, conciliacion.id);

    expect(terminada.estado).toBe('elaborada');
    expect(terminada.elaboradaPorNombre).toBeNull(); // el doble en memoria no resuelve nombres.
  });

  it('quien elaboró la conciliación no la puede autorizar', async () => {
    const conciliacion = await entorno.casos.iniciar.ejecutar(operador, inicio());
    await entorno.casos.terminar.ejecutar(operador, conciliacion.id);

    await expect(entorno.casos.autorizar.ejecutar(operador, conciliacion.id)).rejects.toThrow(AutorizaQuienElaboro);
  });

  it('el superacceso (soporte) sí puede autorizar lo que él mismo elaboró', async () => {
    const soporte = { ...operador, esSuperacceso: true };
    const conciliacion = await entorno.casos.iniciar.ejecutar(soporte, inicio());
    await entorno.casos.terminar.ejecutar(soporte, conciliacion.id);

    const autorizada = await entorno.casos.autorizar.ejecutar(soporte, conciliacion.id);

    expect(autorizada.estado).toBe('autorizada');
  });

  it('otra persona sí la puede autorizar: congela la foto y queda autorizada', async () => {
    const conciliacion = await entorno.casos.iniciar.ejecutar(operador, inicio());
    const idSaldoInicial = conciliacion.candidatos[0]!.id;
    await entorno.casos.marcar.ejecutar(operador, { conciliacionId: conciliacion.id, movimientoIds: [idSaldoInicial] });
    await entorno.casos.terminar.ejecutar(operador, conciliacion.id);

    const autorizada = await entorno.casos.autorizar.ejecutar(otroOperador, conciliacion.id);

    expect(autorizada.estado).toBe('autorizada');
    expect(autorizada.saldoQueDebeMostrarElEstadoDeCuenta).toBe('1000.00');
  });

  it('no se autoriza ni se devuelve si no está elaborada', async () => {
    const conciliacion = await entorno.casos.iniciar.ejecutar(operador, inicio());

    await expect(entorno.casos.autorizar.ejecutar(otroOperador, conciliacion.id)).rejects.toThrow(
      ConciliacionNoEstaElaborada,
    );
    await expect(
      entorno.casos.devolver.ejecutar(operador, { conciliacionId: conciliacion.id, motivo: 'x' }),
    ).rejects.toThrow(ConciliacionNoEstaElaborada);
  });
});

describe('devolver', () => {
  it('regresa a en proceso, con motivo, y se puede volver a marcar', async () => {
    const conciliacion = await entorno.casos.iniciar.ejecutar(operador, inicio());
    const idSaldoInicial = conciliacion.candidatos[0]!.id;
    await entorno.casos.terminar.ejecutar(operador, conciliacion.id);

    const devuelta = await entorno.casos.devolver.ejecutar(otroOperador, {
      conciliacionId: conciliacion.id,
      motivo: 'Faltó marcar el saldo inicial',
    });

    expect(devuelta.estado).toBe('en_proceso');
    expect(auditoria.entradas).toContainEqual(
      expect.objectContaining({
        recurso: 'bancos.conciliaciones',
        registroId: conciliacion.id,
        accion: 'devolver',
        motivo: 'Faltó marcar el saldo inicial',
      }),
    );
    const remarcada = await entorno.casos.marcar.ejecutar(operador, {
      conciliacionId: conciliacion.id,
      movimientoIds: [idSaldoInicial],
    });
    expect(remarcada.saldoQueDebeMostrarElEstadoDeCuenta).toBe('1000.00');
  });
});

describe('un original conciliado y su inverso', () => {
  it('el inverso es un movimiento normal: no se marca solo y queda como partida en tránsito', async () => {
    const idNota = await agregarMovimiento(entorno.movimientos, { fecha: '2026-01-10', monto: '75.00' });
    await conciliarYAutorizar(entorno, 1, (candidatos) => candidatos.map((c) => c.id));
    await entorno.casos.anularMovimiento.ejecutar(operador, {
      movimientoId: idNota,
      motivo: 'Error',
      fecha: '2026-02-05',
    });

    const febrero = await entorno.casos.iniciar.ejecutar(operador, inicio({ mes: 2 }));
    const marcado = await entorno.casos.marcar.ejecutar(operador, { conciliacionId: febrero.id, movimientoIds: [] });

    expect(marcado.candidatos).toHaveLength(1);
    expect(marcado.candidatos[0]).toMatchObject({ tipo: 'debito', monto: '75.00', marcado: false });
    expect(marcado.partidas.otrosDebitosEnTransito).toHaveLength(1);
  });
});

describe('iniciar con pares compensados', () => {
  it('un original y su inverso que nunca pasaron por el banco arrancan marcados juntos', async () => {
    const idNota = await agregarMovimiento(entorno.movimientos, { fecha: '2026-01-10', monto: '75.00' });
    await entorno.casos.anularMovimiento.ejecutar(operador, {
      movimientoId: idNota,
      motivo: 'Error',
      fecha: '2026-01-12',
    });

    const conciliacion = await entorno.casos.iniciar.ejecutar(operador, inicio());

    const marcados = conciliacion.candidatos.filter((c) => c.marcado);
    expect(marcados).toHaveLength(2);
    expect(marcados.map((c) => c.id)).toContain(idNota);
    expect(conciliacion.partidas.creditosEnTransito).toHaveLength(1); // solo el saldo inicial, que nadie marcó
    expect(conciliacion.partidas.otrosDebitosEnTransito).toHaveLength(0);
  });

  it('si el usuario los desmarca no vuelven solos hasta que guarde las marcas (marcar los reincorpora)', async () => {
    const idNota = await agregarMovimiento(entorno.movimientos, { fecha: '2026-01-10', monto: '75.00' });
    await entorno.casos.anularMovimiento.ejecutar(operador, {
      movimientoId: idNota,
      motivo: 'Error',
      fecha: '2026-01-12',
    });
    const conciliacion = await entorno.casos.iniciar.ejecutar(operador, inicio());

    const marcada = await entorno.casos.marcar.ejecutar(operador, {
      conciliacionId: conciliacion.id,
      movimientoIds: [],
    });

    expect(marcada.candidatos.filter((c) => c.marcado)).toHaveLength(2);
  });
});
