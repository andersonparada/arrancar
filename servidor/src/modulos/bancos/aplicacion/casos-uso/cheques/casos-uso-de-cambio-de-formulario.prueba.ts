import { beforeEach, describe, expect, it } from 'vitest';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Cheque } from '../../../dominio/cheque.js';
import { Chequera } from '../../../dominio/chequera.js';
import { ChequeNoDisponible, MovimientoMarcadoEnConciliacion } from '../../../dominio/errores.js';
import { ChequeNoSePasaDeFormulario, ConfirmacionDeCustodiaFaltante } from '../../../dominio/errores-de-impresion.js';
import { CUENTA, armarEntorno, emisionDe, operador } from './soporte-de-pruebas-de-cheques.js';

let casos: Awaited<ReturnType<typeof armarEntorno>>;
let primero = '';
let segundo = '';
let movimientoId = '';

/** Marca el cheque como impreso, como lo haría la impresión. */
async function imprimir(chequeId: string): Promise<void> {
  const cheque = (await casos.cheques.buscar(Identificador.desde(chequeId)))!;
  cheque.marcarImpreso(new Date());
  await casos.cheques.guardar(cheque);
}

const pedido = (cambios: Record<string, unknown> = {}) => ({
  chequeId: primero,
  chequeDestinoId: segundo,
  motivo: 'Se arrugó en la impresora',
  enCustodia: true,
  papelConservado: true,
  ...cambios,
});

beforeEach(async () => {
  casos = await armarEntorno();
  const todos = await casos.cheques.listarDeLaChequera(casos.chequeraId);
  [primero, segundo] = [todos[0]!.id, todos[1]!.id];
  movimientoId = (await casos.emitir.ejecutar(operador, emisionDe(primero, { noNegociable: false }))).id;
  await imprimir(primero);
});

describe('pasar el pago a otro formulario', () => {
  it('el movimiento pasa al destino, el viejo queda inutilizado sin movimiento y el destino nace sin imprimir', async () => {
    const resultado = await casos.pasar.ejecutar(operador, pedido());

    expect(resultado.inutilizado).toMatchObject({
      estado: 'anulado',
      causaDeAnulacion: 'inutilizado',
      movimientoId: null,
      motivoDeAnulacion: 'Se arrugó en la impresora',
    });
    expect(resultado.destino).toMatchObject({
      numero: 2,
      estado: 'emitido',
      movimientoId,
      noNegociable: false,
      impresoEn: null,
    });
    expect(resultado.avisos).toEqual([]);
    expect(await casos.movimientos.saldoDe(CUENTA)).toBe('900.00');
  });

  it('la referencia automática toma el número nuevo; una escrita a mano no se toca', async () => {
    await casos.pasar.ejecutar(operador, pedido());
    expect((await casos.movimientos.obtener(movimientoId)).referencia).toBe('Cheque 2');

    const [, , tercero, cuarto] = await casos.cheques.listarDeLaChequera(casos.chequeraId);
    const conReferencia = (
      await casos.emitir.ejecutar(operador, emisionDe(tercero!.id, { referencia: 'Anticipo de cosecha' }))
    ).id;
    await imprimir(tercero!.id);
    await casos.pasar.ejecutar(operador, pedido({ chequeId: tercero!.id, chequeDestinoId: cuarto!.id }));
    expect((await casos.movimientos.obtener(conReferencia)).referencia).toBe('Anticipo de cosecha');
  });

  it('deja la auditoría con el cheque como estaba, el número nuevo y las dos confirmaciones', async () => {
    await casos.pasar.ejecutar(operador, pedido());

    expect(casos.auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'bancos.cheques',
        accion: 'inutilizar',
        registroId: primero,
        motivo: 'Se arrugó en la impresora',
        anterior: expect.objectContaining({
          numero: 1,
          estado: 'emitido',
          pasoAOtroFormulario: {
            chequeDestinoId: segundo,
            numeroNuevo: 2,
            enCustodia: true,
            papelConservado: true,
          },
        }),
      }),
    ]);
  });

  it('sin una de las dos confirmaciones no cambia nada', async () => {
    await expect(casos.pasar.ejecutar(operador, pedido({ enCustodia: false }))).rejects.toThrow(
      ConfirmacionDeCustodiaFaltante,
    );
    await expect(casos.pasar.ejecutar(operador, pedido({ papelConservado: false }))).rejects.toThrow(
      ConfirmacionDeCustodiaFaltante,
    );

    expect((await casos.cheques.obtener(primero)).estado).toBe('emitido');
    expect(casos.auditoria.entradas).toEqual([]);
  });

  it('el cheque debe estar impreso; el destino, disponible y distinto', async () => {
    const [, , tercero] = await casos.cheques.listarDeLaChequera(casos.chequeraId);
    await casos.emitir.ejecutar(operador, emisionDe(tercero!.id));

    await expect(casos.pasar.ejecutar(operador, pedido({ chequeId: tercero!.id }))).rejects.toThrow(
      ChequeNoSePasaDeFormulario,
    );
    await expect(casos.pasar.ejecutar(operador, pedido({ chequeDestinoId: primero }))).rejects.toThrow(
      ChequeNoSePasaDeFormulario,
    );
    await expect(casos.pasar.ejecutar(operador, pedido({ chequeDestinoId: tercero!.id }))).rejects.toThrow(
      ChequeNoDisponible,
    );
  });

  it('el destino debe ser de la misma cuenta bancaria', async () => {
    const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
    const ajena = Chequera.crear(
      empresaId,
      { cuentaBancariaId: '00000000-0000-4000-8000-000000000002', serie: null, desde: 100, hasta: 101 },
      5000,
    );
    await casos.chequeras.agregar(ajena);
    const deOtraCuenta = Cheque.crear(empresaId, ajena.id.valor, 100);
    await casos.cheques.agregarVarios([deOtraCuenta]);

    await expect(casos.pasar.ejecutar(operador, pedido({ chequeDestinoId: deOtraCuenta.id.valor }))).rejects.toThrow(
      ChequeNoSePasaDeFormulario,
    );
  });

  it('un cheque cuyo movimiento ya marcó el banco en una conciliación no se pasa', async () => {
    casos.movimientos.marcadosEnConciliacion.set(movimientoId, crypto.randomUUID());

    await expect(casos.pasar.ejecutar(operador, pedido())).rejects.toThrow(MovimientoMarcadoEnConciliacion);
    expect((await casos.cheques.obtener(primero)).estado).toBe('emitido');
  });
});

describe('anular como extraviado', () => {
  it('anula el cheque y su pago, y trae el aviso de escribirle al banco', async () => {
    const anulado = await casos.anular.ejecutar(operador, {
      chequeId: primero,
      motivo: 'Se perdió',
      causa: 'extraviado',
    });

    expect(anulado).toMatchObject({ estado: 'anulado', causaDeAnulacion: 'extraviado', movimientoId });
    expect(anulado.aviso).toBe(
      'Avise al banco por escrito para que no pague el cheque 1 (la cancelación y reposición de títulos tiene su propio procedimiento).',
    );
    expect(await casos.movimientos.saldoDe(CUENTA)).toBe('1000.00');
  });

  it('un cheque anulado a mano no lleva ese aviso', async () => {
    const anulado = await casos.anular.ejecutar(operador, { chequeId: primero, motivo: 'Error' });

    expect(anulado).toMatchObject({ causaDeAnulacion: 'manual', aviso: null });
  });
});
