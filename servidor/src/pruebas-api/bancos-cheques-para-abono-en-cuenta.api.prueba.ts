/** IC-2: la casilla «Para abono en cuenta» al emitir, al corregir, desde Cuentas por pagar y al blanquear. */
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { EscenarioDeCheques } from './soporte/escenario-de-impresion-de-cheques.js';
import { auditoriaDe, movimientoDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDeCheques;

beforeAll(async () => {
  e = await EscenarioDeCheques.preparar(entorno, 'icabono');
});

const abonoEnBase = async (movimientoId: string) =>
  (
    await comoPropietario<{ para_abono_en_cuenta: boolean }>(
      'select para_abono_en_cuenta from bancos.movimientos where id = $1',
      [movimientoId],
    )
  )[0]!.para_abono_en_cuenta;

describe('emitir un cheque', () => {
  it('sin la casilla queda apagada', async () => {
    const { movimientoId } = await e.emitir(1);

    expect(await abonoEnBase(movimientoId)).toBe(false);
  });

  it('con la casilla llega al movimiento y a la lista de cheques', async () => {
    const { chequeId, movimientoId } = await e.emitir(2, { paraAbonoEnCuenta: true });

    expect(await abonoEnBase(movimientoId)).toBe(true);
    const lista = await e.propietario.get('/api/bancos/cheques');
    expect(lista.cuerpo.find((c: { id: string }) => c.id === chequeId)).toMatchObject({ paraAbonoEnCuenta: true });
    const cheques = await e.propietario.get(`/api/bancos/chequeras/${e.chequeraId}/cheques`);
    expect(cheques.cuerpo.find((c: { id: string }) => c.id === chequeId)).toMatchObject({ paraAbonoEnCuenta: true });
  });

  it('una nota no lleva la casilla: la base la rechaza', async () => {
    const { cuentaBancariaId, conceptoId } = e;
    const nota = await comoPropietario(
      `insert into bancos.movimientos (empresa_id, cuenta_bancaria_id, tipo, fecha, monto, concepto_id, para_abono_en_cuenta)
       values ($1, $2, 'debito', '2026-02-01', 5, $3, true)`,
      [e.cuenta.empresaId, cuentaBancariaId, conceptoId],
    ).catch((error: { constraint?: string }) => error.constraint);
    expect(nota).toBe('movimientos_abono_en_cuenta_solo_cheque');
  });
});

describe('corregir las condiciones de un cheque emitido y sin imprimir', () => {
  it('cambia las dos casillas y deja la auditoría', async () => {
    const { chequeId, movimientoId } = await e.emitir(3);

    const corregido = await e.propietario.patch(`/api/bancos/cheques/${chequeId}/condiciones`, {
      noNegociable: false,
      paraAbonoEnCuenta: true,
    });

    expect(corregido.estado, JSON.stringify(corregido.cuerpo)).toBe(200);
    expect(corregido.cuerpo).toMatchObject({ noNegociable: false, paraAbonoEnCuenta: true });
    expect(await abonoEnBase(movimientoId)).toBe(true);
    expect((await auditoriaDe(chequeId)).map((a) => a.accion)).toContain('corregir');
  });

  it('un cheque disponible no se corrige', async () => {
    const disponible = await e.chequeDe(40);
    const respuesta = await e.propietario.patch(`/api/bancos/cheques/${disponible}/condiciones`, {
      noNegociable: true,
      paraAbonoEnCuenta: false,
    });
    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('cheque_no_esta_emitido');
  });
});

describe('desde Cuentas por pagar', () => {
  it('un pago con cheque con la casilla la lleva al movimiento; sin ella, no', async () => {
    const pagos = await EscenarioDePagos.preparar(entorno, 'icabonocxp');
    const { proveedor, cargo } = await pagos.proveedorConCargo();

    const conAbono = await pagos.pagar(
      pagos.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '500.00' }], { paraAbonoEnCuenta: true }),
    );
    const sinAbono = await pagos.pagar(pagos.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '100.00' }]));

    expect(conAbono.estado, JSON.stringify(conAbono.cuerpo)).toBe(201);
    expect(await abonoEnBase(conAbono.cuerpo.movimiento.id)).toBe(true);
    expect(await abonoEnBase(sinAbono.cuerpo.movimiento.id)).toBe(false);
    expect(await movimientoDe(pagos.propietario(), conAbono.cuerpo.movimiento.id)).toMatchObject({ tipo: 'cheque' });
  });
});

describe('blanquear', () => {
  it('el movimiento se elimina con su casilla y el cheque vuelve a disponible sin ella', async () => {
    const { chequeId } = await e.emitir(4, { paraAbonoEnCuenta: true });

    const blanqueado = await e.propietario.post(`/api/bancos/cheques/${chequeId}/blanquear`, { motivo: 'Error' });

    expect(blanqueado.cuerpo).toMatchObject({ estado: 'disponible', paraAbonoEnCuenta: false, noNegociable: true });
  });
});
