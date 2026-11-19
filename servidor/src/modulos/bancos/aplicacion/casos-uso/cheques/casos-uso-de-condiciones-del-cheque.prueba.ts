import { beforeEach, describe, expect, it } from 'vitest';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { ChequeImpresoNoSeCorrige, ChequeNoEstaEmitido } from '../../../dominio/errores-de-impresion.js';
import { armarEntorno, emisionDe, operador } from './soporte-de-pruebas-de-cheques.js';

let casos: Awaited<ReturnType<typeof armarEntorno>>;

beforeEach(async () => {
  casos = await armarEntorno();
});

const condiciones = (cambios: Record<string, boolean> = {}) => ({
  chequeId: casos.chequeId,
  noNegociable: true,
  paraAbonoEnCuenta: false,
  ...cambios,
});

describe('emitir con «Para abono en cuenta»', () => {
  it('sin la casilla queda apagada', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emisionDe(casos.chequeId));

    expect(movimiento.paraAbonoEnCuenta).toBe(false);
  });

  it('con la casilla llega al movimiento', async () => {
    const movimiento = await casos.emitir.ejecutar(operador, emisionDe(casos.chequeId, { paraAbonoEnCuenta: true }));

    expect(movimiento.paraAbonoEnCuenta).toBe(true);
  });
});

describe('corregir las condiciones de un cheque emitido', () => {
  it('cambia las dos casillas y deja la auditoría con cómo estaba', async () => {
    await casos.emitir.ejecutar(operador, emisionDe(casos.chequeId));

    const cheque = await casos.corregirCondiciones.ejecutar(
      operador,
      condiciones({ noNegociable: false, paraAbonoEnCuenta: true }),
    );

    expect(cheque).toMatchObject({ noNegociable: false, paraAbonoEnCuenta: true });
    expect(casos.auditoria.entradas).toEqual([
      expect.objectContaining({ recurso: 'bancos.cheques', accion: 'corregir', registroId: casos.chequeId }),
    ]);
  });

  it('un cheque impreso ya no se corrige', async () => {
    await casos.emitir.ejecutar(operador, emisionDe(casos.chequeId));
    const cheque = (await casos.cheques.buscar(Identificador.desde(casos.chequeId)))!;
    cheque.marcarImpreso(new Date());
    await casos.cheques.guardar(cheque);

    await expect(
      casos.corregirCondiciones.ejecutar(operador, condiciones({ paraAbonoEnCuenta: true })),
    ).rejects.toThrow(ChequeImpresoNoSeCorrige);
  });

  it('un cheque disponible no tiene qué corregir', async () => {
    await expect(casos.corregirCondiciones.ejecutar(operador, condiciones())).rejects.toThrow(ChequeNoEstaEmitido);
  });
});
