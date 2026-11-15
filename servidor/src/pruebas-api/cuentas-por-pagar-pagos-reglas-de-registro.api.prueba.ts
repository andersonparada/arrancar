/**
 * Las reglas de pagar con cheque o nota de débito (CP4-3): solo lo autorizado, fecha y monto, beneficiario, diferencias de
 * centavos, lo que Bancos rechaza, dos pagos a la vez, permisos, bancarización según el régimen y las consultas de la ventana.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { EscenarioDePagos, sembrarEfectivo } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias, HOY } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { saldoDe } from './soporte/escenarios-de-bancos.js';

const entorno = usarEntornoApi();
const RUTA_CXP = '/api/cuentas-por-pagar';
let e: EscenarioDePagos;
let soloVer: ClienteApi;
let emite: ClienteApi;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxppagosreglasdos');
  const usuario = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, { nombres, apellidos: 'Pagos', permisos });
  soloVer = await usuario('Solo ve', ['cuentas-por-pagar.pagos.ver']);
  emite = await usuario('Emite', ['cuentas-por-pagar.pagos.ver', 'cuentas-por-pagar.pagos.emitir']);
});

const rechaza = async (cuerpo: Record<string, unknown>, estado: number, codigo: string) => {
  const respuesta = await e.pagar(cuerpo);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(estado);
  expect(respuesta.cuerpo.error.codigo).toBe(codigo);
  return respuesta.cuerpo.error;
};
const pagosGuardados = async () =>
  Number((await consultar<{ n: string }>('select count(*)::text as n from cuentas_por_pagar.pagos'))[0]!.n);

describe('lo que se rechaza', () => {
  it('un cargo sin autorizar y uno fuera de una contraseña vigente', async () => {
    const proveedor = await e.mundo.unProveedor();
    const sinAutorizar = await e.mundo.unCargo(proveedor);
    await e.contrasena(proveedor, [sinAutorizar]);
    const sinContrasena = await e.cargoAutorizado(proveedor);

    await rechaza(
      e.cheque(proveedor.proveedorId, [{ cargoId: sinAutorizar, monto: '10.00' }]),
      422,
      'documento_sin_autorizar',
    );
    await rechaza(
      e.cheque(proveedor.proveedorId, [{ cargoId: sinContrasena, monto: '10.00' }]),
      400,
      'documento_fuera_de_la_contrasena',
    );
  });

  it('un monto mayor que el saldo y una fecha anterior a la emisión', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const antes = await pagosGuardados();

    const error = await rechaza(
      e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1120.01' }]),
      400,
      'pago_mayor_que_el_saldo',
    );
    await rechaza(
      e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '10.00' }], { fecha: haceDias(10) }),
      400,
      'fecha_de_pago_invalida',
    );

    expect(error.detalles).toMatchObject({ campo: 'aplicaciones.0.monto' });
    expect(await pagosGuardados()).toBe(antes);
  });

  it('el beneficiario sale del DTE si Terceros no tiene razón social, y sin ninguno de los dos se rechaza', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const sinRazonSocial = (id: string) =>
      consultar(
        `update terceros.terceros set razon_social = null
          where id = (select tercero_id from terceros.proveedores where id = $1)`,
        [id],
      );
    await sinRazonSocial(proveedor.proveedorId);
    const delDte = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '10.00' }]));
    const saldoInicial = await e.mundo.documentos.sembrarSaldoInicial();
    await e.autorizar(saldoInicial, { yaCompletado: true });
    await e.contrasena({ proveedorId: e.mundo.escenario.proveedorId, nitEmisor: '' }, [saldoInicial]);
    await sinRazonSocial(e.mundo.escenario.proveedorId);

    expect(delDte.estado, JSON.stringify(delDte.cuerpo)).toBe(201);
    expect(delDte.cuerpo.beneficiario).toMatch(/S\.A\.$/);
    const lineas = [{ cargoId: saldoInicial, monto: '10.00' }];
    await rechaza(e.cheque(e.mundo.escenario.proveedorId, lineas), 422, 'proveedor_sin_nombre_del_nit');
  });

  it('lo que Bancos rechaza (sin fondos) no deja nada guardado ni se queda el cheque', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo('100000.00');
    const [antes, saldo] = [await pagosGuardados(), await saldoDe(e.propietario(), e.cuentaBancariaId)];

    await rechaza(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '90000.00' }]), 422, 'saldo_insuficiente');

    expect(await pagosGuardados()).toBe(antes);
    expect(await saldoDe(e.propietario(), e.cuentaBancariaId)).toBe(saldo);
  });

  it('dos pagos a la vez del mismo cargo: uno pasa y el otro se rechaza sin dejar su cheque', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const saldo = Number(await saldoDe(e.propietario(), e.cuentaBancariaId));
    const lineas = [{ cargoId: cargo, monto: '1120.00' }];

    const [uno, dos] = await Promise.all([
      e.pagar(e.cheque(proveedor.proveedorId, lineas)),
      e.pagar(e.cheque(proveedor.proveedorId, lineas)),
    ]);

    expect([uno.estado, dos.estado].sort()).toEqual([201, 400]);
    expect(Number(await saldoDe(e.propietario(), e.cuentaBancariaId))).toBe(saldo - 1120);
  });
});

describe('fecha anterior a la recepción', () => {
  it('avisa sin bloquear si es posterior a la emisión pero anterior a la recepción', async () => {
    const proveedor = await e.mundo.unProveedor();
    const libroId = await e.mundo.documentos.registrar({
      proveedorId: proveedor.proveedorId,
      nitEmisor: proveedor.nitEmisor,
      fechaEmision: haceDias(5),
      fechaRecepcion: HOY,
    });
    const cargo = await e.autorizar((await e.mundo.documentos.fila(libroId))!.id);
    await e.contrasena(proveedor, [cargo]);

    const respuesta = await e.pagar(
      e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '100.00' }], { fecha: haceDias(2) }),
    );

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('anterior a la recepción de la factura');
  });
});

describe('la diferencia de centavos', () => {
  it('se salda como residuo del pago, con su ajuste ligado, su auditoría y su efecto de ingreso', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();

    const respuesta = await e.pagar(
      e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1119.97' }], {
        diferencias: [{ cargoId: cargo, monto: '0.03' }],
      }),
    );

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.diferencias).toEqual([{ cargoId: cargo, monto: '0.03' }]);
    expect((await e.propietario().get(`${RUTA_CXP}/documentos/${cargo}`)).cuerpo).toMatchObject({
      saldo: '0.00',
      estadoDePago: 'pagado',
    });
    const [ajuste] = await consultar<{ id: string; pago_id: string; causa: string }>(
      'select id, pago_id, causa from cuentas_por_pagar.ajustes_de_saldo where documento_id = $1',
      [cargo],
    );
    expect(ajuste).toMatchObject({ pago_id: respuesta.cuerpo.id, causa: 'diferencia_menor' });
    const auditoria = await consultar<{ accion: string; recurso: string }>(
      'select accion, recurso from core.auditoria where registro_id = $1',
      [ajuste!.id],
    );
    expect(auditoria).toEqual([{ accion: 'ajustar', recurso: 'cuentas-por-pagar.ajustes' }]);
  });

  it('pasada del tope o de un cargo que no está en el pago se rechaza, y sin ajustes.crear no se permite', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const ajeno = (await e.proveedorConCargo()).cargo;
    const parcial = [{ cargoId: cargo, monto: '1090.00' }];

    await rechaza(
      e.cheque(proveedor.proveedorId, parcial, { diferencias: [{ cargoId: cargo, monto: '30.00' }] }),
      400,
      'diferencia_de_pago_sobre_el_tope',
    );
    await rechaza(
      e.cheque(proveedor.proveedorId, parcial, { diferencias: [{ cargoId: ajeno, monto: '0.50' }] }),
      400,
      'diferencia_fuera_del_pago',
    );
    const sinPermiso = await e.pagar(
      e.cheque(proveedor.proveedorId, parcial, { diferencias: [{ cargoId: cargo, monto: '0.50' }] }),
      emite,
    );
    expect(sinPermiso.estado).toBe(403);
  });
});

describe('permisos', () => {
  it('pagar pide pagos.emitir; ver los cargos del proveedor, pagos.ver', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const cuerpo = e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '10.00' }]);

    expect((await e.pagar(cuerpo, soloVer)).estado).toBe(403);
    expect((await emite.get(`${RUTA_CXP}/proveedores/${proveedor.proveedorId}/para-pagar`)).estado).toBe(200);
    expect((await soloVer.get(`${RUTA_CXP}/pagos/medios`)).estado).toBe(200);
    expect((await e.pagar(cuerpo, emite)).estado).toBe(201);
  });
});

describe('bancarización', () => {
  it('con una empresa del régimen general, un cargo de Q30,000 o más avisa', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo('30000.00');

    const respuesta = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1000.00' }]));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('Bancarización (Decreto 20-2006)');
  });

  it('con una empresa pequeño contribuyente, sin crédito fiscal ni ISR sobre utilidades, no avisa', async () => {
    const pequeno = await EscenarioDePagos.preparar(entorno, 'cxppagospequeno', {
      regimenIva: 'pequeno_contribuyente',
      agenteDeRetencionIva: 'ninguno',
    });
    const { proveedor, cargo } = await pequeno.proveedorConCargo('30000.00');

    const respuesta = await pequeno.pagar(
      pequeno.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1000.00' }]),
    );

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.avisos.join(' ')).not.toContain('Bancarización');
  });

  it('el cheque que hace llegar el mes al umbral avisa que el efectivo del mes deja de respaldar el gasto', async () => {
    const proveedor = await e.mundo.unProveedor();
    const [grande, otro] = [
      await e.cargoAutorizado(proveedor, '20000.00'),
      await e.cargoAutorizado(proveedor, '9000.00'),
    ];
    await e.contrasena(proveedor, [grande, otro]);
    await sembrarEfectivo(grande, '25000.00');

    const respuesta = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: otro, monto: '5000.00' }]));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    const avisos = respuesta.cuerpo.avisos.join(' ');
    expect(avisos).toContain('los pagos en efectivo de ese mes (recibos 9001)');
    expect(avisos).toContain('Q30,000.00');
  });
});

describe('lo que consulta la ventana de pago', () => {
  it('lista los proveedores por pagar, los medios de pago y los cargos del proveedor con lo propuesto', async () => {
    const proveedor = await e.mundo.unProveedor();
    const [pagable, sinAutorizar] = [await e.cargoAutorizado(proveedor, '5600.00'), await e.mundo.unCargo(proveedor)];
    const contrasena = await e.contrasena(proveedor, [pagable, sinAutorizar]);

    const proveedores = await e.propietario().get(`${RUTA_CXP}/pagos/proveedores-por-pagar`);
    const medios = await e.propietario().get(`${RUTA_CXP}/pagos/medios`);
    const paraPagar = await e
      .propietario()
      .get(`${RUTA_CXP}/proveedores/${proveedor.proveedorId}/para-pagar?contrasenaId=${contrasena}`);

    expect(proveedores.cuerpo.elementos.map((p: { proveedorId: string }) => p.proveedorId)).toContain(
      proveedor.proveedorId,
    );
    expect(medios.cuerpo.cuentas[0]).toMatchObject({ cuentaBancariaId: e.cuentaBancariaId });
    expect(paraPagar.cuerpo).toMatchObject({
      contrasenas: [expect.objectContaining({ id: contrasena })],
      cargos: [expect.objectContaining({ id: pagable, constanciasPendientes: 1 })],
      noAutorizados: [expect.objectContaining({ id: sinAutorizar })],
      umbralDeBancarizacion: '30000.00',
      topeDiferencia: '1.00',
      beneficiario: expect.stringMatching(/S\.A\.$/),
    });
    const [cargoOfrecido] = paraPagar.cuerpo.cargos;
    expect(cargoOfrecido.propuesto).toBe(cargoOfrecido.saldo);
    expect(Number(cargoOfrecido.retencionPorDescontar)).toBeGreaterThan(0);
  });
});
