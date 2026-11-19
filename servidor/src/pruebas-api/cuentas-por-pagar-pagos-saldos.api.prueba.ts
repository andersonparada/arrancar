/**
 * Saldos con pagos (CP4-2): pagado, comprometido y estado de pago de un cargo, la diferencia menor y los reintegros en el
 * saldo, la ficha con sus pagos, y lo mismo en la contraseña y su impresión. Los pagos y reintegros se siembran en la base:
 * los casos de uso que los crean llegan en CP4-3 y CP4-7.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { sembrarPago, sembrarReintegro, anularPagoSembrado } from './soporte/cuentas-por-pagar-pagos.js';
import { notaConSaldoLibre, sembrarAplicacionManual } from './soporte/cuentas-por-pagar-notas.js';
import {
  cuerpoDeContrasena as cuerpoDe,
  EscenarioDeContrasenas,
  RUTA_DE_CONTRASENAS as RUTA,
  type ProveedorDePrueba,
} from './soporte/cuentas-por-pagar-contrasenas.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias, HOY } from './soporte/escenario-de-documentos.js';

const RUTA_CXP = '/api/cuentas-por-pagar';
const entorno = usarEntornoApi();
let mundo: EscenarioDeContrasenas;

beforeAll(async () => {
  mundo = await EscenarioDeContrasenas.preparar(entorno, 'cxppagossaldos');
});

const propietario = () => mundo.propietario();
const ficha = async (id: string) => (await propietario().get(`${RUTA_CXP}/documentos/${id}`)).cuerpo;

/** Una contraseña de un proveedor nuevo con un cargo de Q1,120.00. */
async function contrasenaConUnCargo(proveedor?: ProveedorDePrueba) {
  const dueno = proveedor ?? (await mundo.unProveedor());
  const cargo = await mundo.unCargo(dueno);
  const creada = await mundo.crear(cuerpoDe(dueno.proveedorId, [cargo]));
  expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
  return { proveedor: dueno, cargo, contrasena: creada.cuerpo };
}

const pagar = (contrasenaId: string, cargoPropio: string, ...[monto, fecha]: [monto: string, fecha?: string]) =>
  sembrarPago(mundo.escenario, { contrasenaId, lineas: [{ cargoPropio, monto }], fecha });

describe('el saldo de un cargo con pagos', () => {
  it('sin pagos está pendiente y debe todo', async () => {
    const { cargo } = await contrasenaConUnCargo();

    expect(await ficha(cargo)).toMatchObject({
      pagado: '0.00',
      comprometido: '0.00',
      estadoDePago: 'pendiente',
      saldo: '1120.00',
      pagos: [],
    });
  });

  it('un pago vigente baja el saldo, queda en parte y sale en la ficha con su número y su forma', async () => {
    const { cargo, contrasena } = await contrasenaConUnCargo();
    const pago = await pagar(contrasena.id, cargo, '400.00');

    expect(await ficha(cargo)).toMatchObject({
      pagado: '400.00',
      comprometido: '0.00',
      estadoDePago: 'en_parte',
      saldo: '720.00',
      pagos: [
        {
          pagoId: pago.id,
          numero: String(pago.numero),
          forma: 'cuenta_de_apertura',
          estado: 'vigente',
          monto: '400.00',
          contrasenaId: contrasena.id,
          comprometido: false,
        },
      ],
    });
  });

  it('pagado del todo queda en cero, sale del filtro «con saldo» y del saldo del proveedor', async () => {
    const { cargo, contrasena, proveedor } = await contrasenaConUnCargo();
    const pendiente = await mundo.unCargo(proveedor);
    await pagar(contrasena.id, cargo, '1120.00');

    expect(await ficha(cargo)).toMatchObject({ pagado: '1120.00', estadoDePago: 'pagado', saldo: '0.00' });
    const conSaldo = await propietario().get(
      `${RUTA_CXP}/documentos?proveedorId=${proveedor.proveedorId}&conSaldo=true`,
    );
    expect(conSaldo.cuerpo.elementos.map((e: { id: string }) => e.id)).toEqual([pendiente]);
    const saldo = await propietario().get(`${RUTA_CXP}/proveedores/${proveedor.proveedorId}/saldo`);
    expect(saldo.cuerpo).toMatchObject({ porPagar: '1120.00', cargosConSaldo: 1 });
  });

  it('un cheque posfechado compromete el documento hoy (la deuda sigue) y se da por pagado en su fecha', async () => {
    const { cargo, contrasena, proveedor } = await contrasenaConUnCargo();
    const pago = await pagar(contrasena.id, cargo, '1120.00', haceDias(-5));

    expect(await ficha(cargo)).toMatchObject({
      pagado: '0.00',
      comprometido: '1120.00',
      estadoDePago: 'comprometido',
      saldo: '1120.00',
      disponible: '0.00',
      chequesPosfechados: 1,
      comprometidoHasta: haceDias(-5),
      pagos: [expect.objectContaining({ comprometido: true })],
    });
    const saldo = await propietario().get(`${RUTA_CXP}/proveedores/${proveedor.proveedorId}/saldo`);
    expect(saldo.cuerpo).toMatchObject({
      porPagar: '1120.00',
      comprometido: '1120.00',
      disponible: '0.00',
      cargosConSaldo: 1,
      posfechados: [expect.objectContaining({ fecha: haceDias(-5), monto: '1120.00' })],
    });

    await consultar('update cuentas_por_pagar.pagos set fecha = $2 where id = $1', [pago.id, HOY]);

    expect(await ficha(cargo)).toMatchObject({ pagado: '1120.00', comprometido: '0.00', estadoDePago: 'pagado' });
  });

  it('un pago anulado no cuenta: el saldo vuelve y la ficha lo conserva como anulado', async () => {
    const { cargo, contrasena } = await contrasenaConUnCargo();
    const pago = await pagar(contrasena.id, cargo, '500.00');
    await anularPagoSembrado(mundo.escenario, pago.id);

    const despues = await ficha(cargo);

    expect(despues).toMatchObject({ pagado: '0.00', estadoDePago: 'pendiente', saldo: '1120.00' });
    expect(despues.pagos).toEqual([expect.objectContaining({ pagoId: pago.id, estado: 'anulado' })]);
  });

  it('la diferencia menor de un cargo (ajuste ligado a su pago) también baja el saldo', async () => {
    const { cargo, contrasena } = await contrasenaConUnCargo();
    const pago = await pagar(contrasena.id, cargo, '1119.97');
    await consultar(
      `insert into cuentas_por_pagar.ajustes_de_saldo (empresa_id, proveedor_id, documento_id, monto, fecha, causa, motivo,
         pago_id)
       select empresa_id, proveedor_id, id, 0.03, current_date, 'diferencia_menor', 'Centavos', $2
         from cuentas_por_pagar.documentos where id = $1`,
      [cargo, pago.id],
    );

    expect(await ficha(cargo)).toMatchObject({ ajustado: '0.03', saldo: '0.00', estadoDePago: 'pagado' });
  });

  it('las notas aplicadas a mano y los pagos se suman en el saldo', async () => {
    const { cargo, contrasena, proveedor } = await contrasenaConUnCargo();
    const nota = await notaConSaldoLibre(mundo.documentos, proveedor);
    await sembrarAplicacionManual({ notaPropia: nota.notaPropia, cargoPropio: cargo, monto: '20.00' });
    await pagar(contrasena.id, cargo, '300.00');

    expect(await ficha(cargo)).toMatchObject({ aplicado: '20.00', pagado: '300.00', saldo: '800.00' });
  });

  it('un saldo inicial paga contra su saldo al inicio', async () => {
    const proveedor = await mundo.unProveedor();
    const inicial = await mundo.documentos.sembrarSaldoInicial({ proveedorId: proveedor.proveedorId });
    const creada = await mundo.crear(cuerpoDe(proveedor.proveedorId, [inicial]));
    expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
    await pagar(creada.cuerpo.id, inicial, '300.00');

    expect(await ficha(inicial)).toMatchObject({ neto: '700.00', pagado: '300.00', saldo: '400.00' });
  });
});

describe('el saldo libre de una nota con reintegros', () => {
  it('un reintegro vigente lo baja, y uno anulado no cuenta', async () => {
    const proveedor = await mundo.unProveedor();
    const nota = await notaConSaldoLibre(mundo.documentos, proveedor);
    expect(await ficha(nota.notaPropia)).toMatchObject({
      saldo: '100.00',
      reintegrado: '0.00',
      puedeReintegrar: false,
    });
    await propietario().post(`${RUTA_CXP}/documentos/registrar`, { documentos: [{ id: nota.notaPropia }] });

    await sembrarReintegro(mundo.escenario, { notaPropia: nota.notaPropia, monto: '30.00' });
    const anulado = await sembrarReintegro(mundo.escenario, {
      notaPropia: nota.notaPropia,
      monto: '10.00',
      estado: 'anulado',
    });

    const despues = await ficha(nota.notaPropia);
    expect(despues).toMatchObject({ reintegrado: '30.00', saldo: '70.00', estadoDePago: null, puedeReintegrar: true });
    expect(despues.reintegros).toEqual([
      expect.objectContaining({ forma: 'efectivo', estado: 'vigente', monto: '30.00' }),
      expect.objectContaining({ reintegroId: anulado, estado: 'anulado', monto: '10.00' }),
    ]);
    const saldo = await propietario().get(`${RUTA_CXP}/proveedores/${proveedor.proveedorId}/saldo`);
    expect(saldo.cuerpo.saldosDeudores).toBe('70.00');
  });
});

describe('la contraseña con pagos', () => {
  it('trae lo pagado y comprometido por cargo, sus pagos y su estado, y ya no se anula', async () => {
    const { cargo, contrasena } = await contrasenaConUnCargo();
    const posfechado = await pagar(contrasena.id, cargo, '120.00', haceDias(-3));
    const vigente = await pagar(contrasena.id, cargo, '300.00');
    const anulado = await pagar(contrasena.id, cargo, '50.00');
    await anularPagoSembrado(mundo.escenario, anulado.id);

    const { cuerpo } = await propietario().get(`${RUTA}/${contrasena.id}`);

    expect(cuerpo.cargos[0]).toMatchObject({
      pagado: '300.00',
      comprometido: '120.00',
      saldo: '820.00',
      disponible: '700.00',
      comprometidoHasta: haceDias(-3),
    });
    expect(cuerpo.totales).toMatchObject({
      pagado: '300.00',
      comprometido: '120.00',
      saldo: '820.00',
      disponible: '700.00',
    });
    expect(cuerpo).toMatchObject({ estadoDePago: 'en_parte', puedeEditar: true, puedeAnular: false });
    expect(
      cuerpo.pagos.map((p: { pagoId: string; estado: string; comprometido: boolean }) => [
        p.pagoId,
        p.estado,
        p.comprometido,
      ]),
    ).toEqual([
      [posfechado.id, 'vigente', true],
      [vigente.id, 'vigente', false],
      [anulado.id, 'anulado', false],
    ]);
  });

  it('la lista trae su estado de pago, y una contraseña pagada del todo está «pagado»', async () => {
    const { cargo, contrasena, proveedor } = await contrasenaConUnCargo();
    await pagar(contrasena.id, cargo, '1120.00');

    const lista = await propietario().get(`${RUTA}?proveedorId=${proveedor.proveedorId}`);

    expect(lista.cuerpo.elementos).toEqual([
      expect.objectContaining({ id: contrasena.id, estadoDePago: 'pagado', saldo: '0.00' }),
    ]);
  });

  it('un pago solo anulado deja la contraseña con su acción de anular', async () => {
    const { cargo, contrasena } = await contrasenaConUnCargo();
    await anularPagoSembrado(mundo.escenario, (await pagar(contrasena.id, cargo, '10.00')).id);

    const { cuerpo } = await propietario().get(`${RUTA}/${contrasena.id}`);

    expect(cuerpo).toMatchObject({ estadoDePago: 'pendiente', puedeAnular: true });
  });

  it('la impresión separa «Pagado» y «Comprometido», deja la deuda en «Saldo» y marca el cheque posfechado', async () => {
    const { cargo, contrasena } = await contrasenaConUnCargo();
    await pagar(contrasena.id, cargo, '300.00');
    const cheque = await pagar(contrasena.id, cargo, '120.00', haceDias(-3));

    const { cuerpo } = await propietario().get(`${RUTA}/${contrasena.id}/impresion`);

    expect(cuerpo.cargos[0]).toMatchObject({ pagado: '300.00', comprometido: '120.00', saldo: '820.00' });
    expect(cuerpo.chequesPosfechados).toEqual([
      {
        pagoId: cheque.id,
        monto: '120.00',
        texto: `Pago ${cheque.numero} al ${haceDias(-3).split('-').reverse().join('/')}`,
      },
    ]);
  });
});
