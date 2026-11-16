/**
 * Casos especiales de los reportes de saldos (CP5-2): un NIT en dos fichas de proveedor y los proveedores «CF» (que
 * Terceros hoy no deja repetir, así que se siembran), y el cheque posfechado que el banco cobró antes de su fecha según la
 * conciliación de Bancos (autorizada, elaborada o en proceso).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { sembrarDocumento } from './soporte/cuentas-por-pagar-reportes.js';
import { MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const R1 = '/api/cuentas-por-pagar/reportes/saldos-por-proveedor';
const entorno = usarEntornoApi();

describe('R1 agrupa por NIT', () => {
  let escenario: EscenarioDeDocumentos;
  const proveedor = async (nombre: string, nit: string) =>
    (await registrarProveedor(escenario.cuenta, nombre, { nit: nitValido(nit) })).proveedorId;
  const documento = (
    proveedorId: string,
    numero: string,
    { monto, tipo }: { monto: string; tipo: 'factura' | 'nota_de_credito' },
  ) =>
    sembrarDocumento(escenario, {
      proveedorId,
      numero,
      emision: '2026-01-10',
      vencimiento: tipo === 'factura' ? '2026-02-10' : null,
      monto,
      tipo,
    });
  const ponerNit = (proveedorId: string, nit: string) =>
    consultar(
      `update terceros.terceros set nit = $2 where id = (select tercero_id from terceros.proveedores where id = $1)`,
      [proveedorId, nit],
    );

  beforeAll(async () => {
    escenario = await prepararEscenario(entorno, 'cxprepnit', MODULOS_DE_CUENTAS_POR_PAGAR);
  });

  it('un NIT en dos fichas va en una fila con sus fichas como subrenglones, neteado, y avisa', async () => {
    const [uno, otro] = [await proveedor('Aceros del Norte', '6100001'), await proveedor('Bodegas Zeta', '6100002')];
    await documento(uno, 'U1', { monto: '500', tipo: 'factura' });
    await documento(otro, 'O1', { monto: '200', tipo: 'nota_de_credito' });
    const nit = nitValido('6100001');
    await consultar('drop index terceros.terceros_nit_por_cuenta_idx');
    try {
      await ponerNit(otro, nit);
      const respuesta = await escenario.cuenta.propietario.get(`${R1}?corte=2026-03-31`);
      const [fila, ...demas] = respuesta.cuerpo.acreedores;

      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
      expect(demas).toEqual([]);
      expect(respuesta.cuerpo.deudores).toEqual([]);
      expect(fila).toMatchObject({
        nit,
        proveedorId: null,
        totalCargos: '500.00',
        saldosAFavor: '200.00',
        saldoNeto: '300.00',
      });
      expect(fila.fichas).toMatchObject([
        { nombre: 'Aceros del Norte', totalCargos: '500.00', saldoNeto: '500.00' },
        { nombre: 'Bodegas Zeta', saldosAFavor: '200.00', saldoNeto: '-200.00' },
      ]);
      expect(respuesta.cuerpo.avisos).toEqual(
        expect.arrayContaining([expect.objectContaining({ codigo: 'nit_en_varias_fichas' })]),
      );
    } finally {
      await ponerNit(otro, nitValido('6100002'));
      await consultar(
        `create unique index terceros_nit_por_cuenta_idx on terceros.terceros (cuenta_id, nit) where nit <> 'CF'`,
      );
    }
  });

  it('los proveedores con «CF» no se agrupan entre sí: uno debe y al otro le debemos', async () => {
    const [uno, otro] = [await proveedor('Café Maya', '6100003'), await proveedor('Distribuidora Quetzal', '6100004')];
    await documento(uno, 'C1', { monto: '100', tipo: 'factura' });
    await documento(otro, 'C2', { monto: '100', tipo: 'nota_de_credito' });
    await ponerNit(uno, 'CF');
    await ponerNit(otro, 'CF');

    const respuesta = await escenario.cuenta.propietario.get(`${R1}?corte=2026-03-31&proveedorId=${uno}`);
    const completo = await escenario.cuenta.propietario.get(`${R1}?corte=2026-03-31`);

    expect(respuesta.cuerpo.acreedores).toMatchObject([{ nombre: 'Café Maya', nit: null, saldoNeto: '100.00' }]);
    const nombres = (filas: Array<{ nombre: string }>) => filas.map(({ nombre }) => nombre);
    expect(nombres(completo.cuerpo.acreedores)).toContain('Café Maya');
    expect(nombres(completo.cuerpo.deudores)).toContain('Distribuidora Quetzal');
  });
});

describe('el cheque posfechado cobrado antes de su fecha', () => {
  let e: EscenarioDePagos;
  let proveedorId: string;
  let cargoPropio: string;
  let neto: string;
  let conciliacionId: string;

  /** Corta R1 del proveedor y devuelve lo que pasa con su cheque. */
  const al = async (corte: string) => {
    const respuesta = await e.propietario().get(`${R1}?corte=${corte}&proveedorId=${proveedorId}&incluirSinSaldo=true`);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    return {
      fila: respuesta.cuerpo.acreedores[0],
      avisos: respuesta.cuerpo.avisos.map((a: { codigo: string }) => a.codigo),
    };
  };
  const estadoDeLaConciliacion = (estado: 'autorizada' | 'elaborada' | 'en_proceso') =>
    consultar(`update bancos.conciliaciones set estado = $2, previa_al_saldo_transcrito = $3 where id = $1`, [
      conciliacionId,
      estado,
      estado !== 'en_proceso',
    ]);

  beforeAll(async () => {
    e = await EscenarioDePagos.preparar(entorno, 'cxprepcheque');
    const { cuenta } = e.mundo.escenario;
    expect(
      (await cuenta.propietario.put(`/api/empresas/${cuenta.empresaId}/carga-inicial`, { fechaDeInicio: '2026-01-01' }))
        .estado,
    ).toBe(200);
    const { proveedor, cargo } = await e.proveedorConCargo();
    proveedorId = proveedor.proveedorId;
    cargoPropio = cargo;
    await consultar(
      `update cuentas_por_pagar.documentos set fecha_emision = '2026-02-01', vencimiento = '2026-03-01' where id = $1`,
      [cargo],
    );
    const ficha = await e.propietario().get(`/api/cuentas-por-pagar/documentos/${cargo}`);
    neto = ficha.cuerpo.saldo;
    const pago = await e.pagar(e.cheque(proveedorId, [{ cargoId: cargo, monto: neto }], { fecha: '2090-01-01' }));
    expect(pago.estado, JSON.stringify(pago.cuerpo)).toBe(201);
    await consultar(`update cuentas_por_pagar.pagos set fecha = '2026-04-15', creado_en = '2026-03-10' where id = $1`, [
      pago.cuerpo.id,
    ]);
    const [conciliacion] = await consultar<{ id: string }>(
      `insert into bancos.conciliaciones (empresa_id, cuenta_bancaria_id, anio, mes, estado, previa_al_saldo_transcrito)
       select empresa_id, cuenta_bancaria_id, 2026, 3, 'autorizada', true from bancos.movimientos where id = $1
       returning id`,
      [pago.cuerpo.movimiento.id],
    );
    conciliacionId = conciliacion!.id;
    await consultar('update bancos.movimientos set conciliacion_id = $2 where id = $1', [
      pago.cuerpo.movimiento.id,
      conciliacionId,
    ]);
  }, 60_000);

  it('dentro del mes conciliado sigue comprometido y avisa que Bancos no guarda el día del cobro', async () => {
    const { fila, avisos } = await al('2026-03-15');

    expect(fila).toMatchObject({ totalCargos: neto, saldoNeto: neto, comprometido: neto, disponible: '0.00' });
    expect(avisos).toContain('cheque_cobrado_antes_de_su_fecha');
  });

  it('desde el fin del mes de la conciliación autorizada ya rebaja el saldo y deja de estar comprometido', async () => {
    for (const corte of ['2026-03-31', '2026-04-10']) {
      const { fila, avisos } = await al(corte);

      expect(fila, corte).toMatchObject({ totalCargos: '0.00', saldoNeto: '0.00', comprometido: '0.00' });
      expect(avisos, corte).not.toContain('cheque_cobrado_antes_de_su_fecha');
    }
  });

  it('con la conciliación elaborada o en proceso nada cambia: el cheque cuenta desde su fecha', async () => {
    for (const estado of ['elaborada', 'en_proceso'] as const) {
      await estadoDeLaConciliacion(estado);
      const { fila, avisos } = await al('2026-03-31');

      expect(fila, estado).toMatchObject({ saldoNeto: neto, comprometido: neto });
      expect(avisos, estado).not.toContain('cheque_cobrado_antes_de_su_fecha');
      expect((await al('2026-04-15')).fila, estado).toMatchObject({ saldoNeto: '0.00', comprometido: '0.00' });
    }
    expect(cargoPropio).toBeTruthy();
  });
});
