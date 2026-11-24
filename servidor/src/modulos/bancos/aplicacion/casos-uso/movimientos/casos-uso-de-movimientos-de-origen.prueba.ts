import { beforeEach, describe, expect, it } from 'vitest';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { ReglaDeNegocioInfringida } from '../../../../core/compartido/dominio/errores.js';
import {
  CuentasPorPagarInactivo,
  DesgloseNoSuma,
  ModuloDeOrigenInactivo,
  MotivoObligatorio,
  MovimientoDeOtroModulo,
  NotaMarcadaConDesglose,
  NotaNoMarcada,
  NotaNoMarcable,
  NotaYaMarcada,
  OrigenDelMovimientoNoCoincide,
} from '../../../dominio/errores-de-origen.js';
import { CONCEPTO_GENERAL, idDeSistema } from '../../../pruebas/conceptos-de-prueba.js';
import { armarEntorno, nota, operador } from './soporte-de-pruebas-de-movimientos.js';

class Rechazo extends ReglaDeNegocioInfringida {
  readonly codigo = 'rechazo_del_modulo';
}

const ORIGEN = { modulo: 'cuentas-por-pagar', documentoId: '00000000-0000-4000-8000-0000000000bb' };
const PAGO = idDeSistema('pago_a_proveedor');
const ACTIVO = idDeSistema('pago_a_proveedor_de_activo');
let casos: ReturnType<typeof armarEntorno>;

const pago = (montoCentavos: number) => ({ claveDeSistema: 'pago_a_proveedor' as const, montoCentavos });
const deOtroModulo = (cambios: Record<string, unknown> = {}) =>
  nota({ tipo: 'debito', origen: ORIGEN, conceptos: [pago(10000)], conceptoId: undefined, ...cambios });
const debito = (cambios: Record<string, unknown> = {}) => nota({ tipo: 'debito', ...cambios });

beforeEach(() => {
  casos = armarEntorno({ permiteSobregiro: true, cuentasPorPagar: true });
});

describe('registrar lo que manda otro módulo', () => {
  it('guarda el origen y toma el concepto de las líneas, sin pasar por las reglas del usuario', async () => {
    const creada = await casos.crear.ejecutar(operador, deOtroModulo());

    expect(creada).toMatchObject({
      moduloDeOrigen: 'cuentas-por-pagar',
      documentoDeOrigenId: ORIGEN.documentoId,
      conceptoId: PAGO,
      puedeEliminar: false,
    });
    expect(casos.desgloses.porMovimiento.size).toBe(0);
  });

  it('con varios conceptos el movimiento lleva el de mayor monto y se guarda el reparto', async () => {
    const creada = await casos.crear.ejecutar(
      operador,
      deOtroModulo({ conceptos: [pago(3000), { claveDeSistema: 'pago_a_proveedor_de_activo', montoCentavos: 7000 }] }),
    );

    expect(creada.conceptoId).toBe(ACTIVO);
    expect(casos.desgloses.porMovimiento.get(creada.id)).toEqual([
      { conceptoId: PAGO, monto: '30.00' },
      { conceptoId: ACTIVO, monto: '70.00' },
    ]);
  });

  it('un reparto que no suma el monto se rechaza y no guarda la nota', async () => {
    await expect(casos.crear.ejecutar(operador, deOtroModulo({ conceptos: [pago(9999)] }))).rejects.toThrow(
      DesgloseNoSuma,
    );

    expect(await casos.registros.listar({})).toEqual([]);
  });
});

describe('registrar una nota ya marcada', () => {
  it('lleva el concepto «Pago a proveedores» con Cuentas por pagar activo', async () => {
    const creada = await casos.crear.ejecutar(
      operador,
      debito({ conceptoId: undefined, marcarParaCuentasPorPagar: true }),
    );

    expect(creada).toMatchObject({ conceptoId: PAGO, marcadaParaModulo: 'cuentas-por-pagar' });
  });

  it('se rechaza si no es de débito o si el módulo está inactivo', async () => {
    const sinModulo = armarEntorno({ cuentasPorPagar: false });

    await expect(
      casos.crear.ejecutar(operador, nota({ tipo: 'credito', marcarParaCuentasPorPagar: true })),
    ).rejects.toThrow(NotaNoMarcable);
    await expect(
      sinModulo.crear.ejecutar(operador, debito({ conceptoId: undefined, marcarParaCuentasPorPagar: true })),
    ).rejects.toThrow(CuentasPorPagarInactivo);
  });
});

describe('marcar y desmarcar', () => {
  it('marcar pone el concepto de pago; una segunda vez, o una nota de crédito, se rechaza', async () => {
    const id = (await casos.crear.ejecutar(operador, debito())).id;
    const credito = (await casos.crear.ejecutar(operador, nota())).id;

    const marcada = await casos.marcar.ejecutar(operador, id);

    expect(marcada).toMatchObject({ conceptoId: PAGO, marcadaParaModulo: 'cuentas-por-pagar', puedeDesmarcar: true });
    await expect(casos.marcar.ejecutar(operador, id)).rejects.toThrow(NotaYaMarcada);
    await expect(casos.marcar.ejecutar(operador, credito)).rejects.toThrow(NotaNoMarcable);
    expect(casos.auditoria.entradas).toContainEqual(
      expect.objectContaining({ accion: 'corregir', registroId: id, motivo: 'Marcada para Cuentas por pagar' }),
    );
  });

  it('desmarcar avisa, pide motivo, pone el concepto elegido y quita el reparto', async () => {
    const id = (
      await casos.crear.ejecutar(operador, debito({ conceptoId: undefined, marcarParaCuentasPorPagar: true }))
    ).id;
    casos.desgloses.porMovimiento.set(id, [{ conceptoId: ACTIVO, monto: '100.00' }]);

    await expect(
      casos.desmarcar.ejecutar(operador, { movimientoId: id, motivo: ' ', conceptoId: CONCEPTO_GENERAL }),
    ).rejects.toThrow(MotivoObligatorio);
    const desmarcada = await casos.desmarcar.ejecutar(operador, {
      movimientoId: id,
      motivo: 'Era de otro proveedor',
      conceptoId: CONCEPTO_GENERAL,
    });

    expect(desmarcada).toMatchObject({ conceptoId: CONCEPTO_GENERAL, marcadaParaModulo: null });
    expect(casos.avisos.recibidos).toEqual([
      expect.objectContaining({ cambio: 'desmarcar', motivo: 'Era de otro proveedor' }),
    ]);
    expect(casos.desgloses.porMovimiento.has(id)).toBe(false);
    await expect(
      casos.desmarcar.ejecutar(operador, { movimientoId: id, motivo: 'Otra vez', conceptoId: CONCEPTO_GENERAL }),
    ).rejects.toThrow(NotaNoMarcada);
  });

  it('si el módulo rechaza el aviso la nota sigue marcada', async () => {
    const id = (
      await casos.crear.ejecutar(operador, debito({ conceptoId: undefined, marcarParaCuentasPorPagar: true }))
    ).id;
    casos.avisos.rechazarCon = new Rechazo('Está ligada a un pago.');

    await expect(
      casos.desmarcar.ejecutar(operador, { movimientoId: id, motivo: 'Cambio', conceptoId: CONCEPTO_GENERAL }),
    ).rejects.toThrow('Está ligada a un pago.');
    expect((await casos.obtener.ejecutar(operador, id)).marcadaParaModulo).toBe('cuentas-por-pagar');
  });

  it('reclasificar una nota marcada con reparto no se permite; sin reparto avisa «reclasificar»', async () => {
    const id = (
      await casos.crear.ejecutar(operador, debito({ conceptoId: undefined, marcarParaCuentasPorPagar: true }))
    ).id;
    const sinReparto = await casos.reclasificar.ejecutar(operador, {
      movimientoIds: [id],
      conceptoId: CONCEPTO_GENERAL,
    });

    expect(sinReparto.reclasificados).toBe(1);
    expect(casos.avisos.recibidos.map((aviso) => aviso.cambio)).toEqual(['reclasificar']);

    const otro = (
      await casos.crear.ejecutar(operador, debito({ conceptoId: undefined, marcarParaCuentasPorPagar: true }))
    ).id;
    casos.registros.conDesglose.add(otro);
    await expect(
      casos.reclasificar.ejecutar(operador, { movimientoIds: [otro], conceptoId: CONCEPTO_GENERAL }),
    ).rejects.toThrow(NotaMarcadaConDesglose);
  });
});

describe('anular, eliminar y corregir lo de otro módulo', () => {
  it('anular avisa con la forma «con_inverso» y deja pasar', async () => {
    const id = (await casos.crear.ejecutar(operador, deOtroModulo())).id;

    await casos.anular.ejecutar(operador, { movimientoId: id, motivo: 'Error', fecha: '2026-02-01' });

    expect(casos.avisos.recibidos).toEqual([
      expect.objectContaining({
        cambio: 'anular',
        formaDeAnulacion: 'con_inverso',
        fecha: '2026-02-01',
        motivo: 'Error',
      }),
    ]);
  });

  it('anular por una orden (pedidoPor) no avisa al que pide, pero exige que sea suyo', async () => {
    const id = (await casos.crear.ejecutar(operador, deOtroModulo())).id;

    await expect(
      casos.anular.ejecutar(operador, {
        movimientoId: id,
        motivo: 'Error',
        pedidoPor: { ...ORIGEN, documentoId: 'otro' },
      }),
    ).rejects.toThrow(OrigenDelMovimientoNoCoincide);
    await casos.anular.ejecutar(operador, { movimientoId: id, motivo: 'Error', pedidoPor: ORIGEN });

    expect(casos.avisos.recibidos).toEqual([]);
  });

  it('eliminar y corregir avisan primero y, si pasan, Bancos los rechaza por ser de otro módulo', async () => {
    const id = (await casos.crear.ejecutar(operador, deOtroModulo())).id;

    await expect(casos.eliminar.ejecutar(operador, { movimientoId: id, motivo: 'Error' })).rejects.toThrow(
      MovimientoDeOtroModulo,
    );
    await expect(
      casos.actualizar.ejecutar(operador, {
        movimientoId: id,
        solicitud: debito({ referencia: 'Cambio' }),
        esSaldoInicial: false,
      }),
    ).rejects.toThrow(MovimientoDeOtroModulo);

    expect(casos.avisos.recibidos.map((aviso) => aviso.cambio)).toEqual(['eliminar', 'corregir']);
    expect(await casos.registros.listar({})).toHaveLength(1);
  });

  it('con el módulo de origen inactivo se rechaza todo cambio sin avisar', async () => {
    const id = (await casos.crear.ejecutar(operador, deOtroModulo())).id;
    const inactivo = armarEntorno({ cuentasPorPagar: false });
    await inactivo.registros.agregar((await casos.registros.buscar(Identificador.desde(id)))!);

    await expect(inactivo.anular.ejecutar(operador, { movimientoId: id, motivo: 'Error' })).rejects.toThrow(
      ModuloDeOrigenInactivo,
    );
    await expect(inactivo.eliminar.ejecutar(operador, { movimientoId: id, motivo: 'Error' })).rejects.toThrow(
      ModuloDeOrigenInactivo,
    );
    expect(inactivo.avisos.recibidos).toEqual([]);
  });

  it('un movimiento común no avisa a nadie', async () => {
    const id = (await casos.crear.ejecutar(operador, nota())).id;

    await casos.eliminar.ejecutar(operador, { movimientoId: id, motivo: 'Error' });

    expect(casos.avisos.recibidos).toEqual([]);
  });
});
