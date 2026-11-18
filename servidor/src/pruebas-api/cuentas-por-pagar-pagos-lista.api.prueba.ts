/**
 * La lista de pagos (CP4-8): por omisión los vigentes, con filtros de proveedor, contraseña (por las líneas, porque un
 * pago cubre varias), forma, estado, posfechados, fechas, cuenta bancaria y retiro, la paginación y el permiso.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { anularPago, cuentaConFondos } from './soporte/cuentas-por-pagar-pagos-cambios.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { registrarRetiro, retiroConCheque, sembrarPagoDelRetiro } from './soporte/cuentas-por-pagar-retiros.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { haceDias } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const RUTA = '/api/cuentas-por-pagar/pagos';
let e: EscenarioDePagos;
let sinPermiso: ClienteApi;
let proveedorA: { proveedorId: string };
let cheque: { id: string; contrasenas: Array<{ id: string }>; numero: string };
let posfechado: string;
let anulado: string;
let nota: string;
let efectivo: string;
let retiroId: string;
let otraCuenta: { cuentaBancariaId: string; chequeraId: string };
let enOtraCuenta: string;

interface Fila {
  id: string;
  numero: string;
  proveedor: { id: string; nombre: string };
  contrasenas: Array<{ id: string; numero: string }>;
  forma: string;
  posfechado: boolean;
  monto: string;
  estado: string;
  movimiento: { cuentaBancariaNombre: string; numero: number | null } | null;
  retiro: { id: string; numero: string; custodio: string } | null;
}

const lista = async (consulta = '') => {
  const respuesta = await e.propietario().get(`${RUTA}${consulta}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo as { elementos: Fila[]; total: number };
};
const ids = (pagina: { elementos: Fila[] }) => pagina.elementos.map(({ id }) => id).sort();

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxppagoslista');
  sinPermiso = await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
    nombres: 'Sin',
    apellidos: 'Pagos',
    permisos: ['cuentas-por-pagar.documentos.ver'],
  });
  const a = await e.mundo.unProveedor();
  proveedorA = a;
  const [uno, dos] = [await e.cargoAutorizado(a), await e.cargoAutorizado(a, '500.00')];
  await e.contrasena(a, [uno]);
  await e.contrasena(a, [dos]);
  cheque = (
    await e.pagar(
      e.cheque(a.proveedorId, [
        { cargoId: uno, monto: '1120.00' },
        { cargoId: dos, monto: '500.00' },
      ]),
    )
  ).cuerpo;
  const b = await e.proveedorConCargo();
  posfechado = (
    await e.pagar(e.cheque(b.proveedor.proveedorId, [{ cargoId: b.cargo, monto: '1120.00' }], { fecha: haceDias(-5) }))
  ).cuerpo.id;
  const c = await e.proveedorConCargo();
  anulado = (await e.pagar(e.cheque(c.proveedor.proveedorId, [{ cargoId: c.cargo, monto: '1120.00' }]))).cuerpo.id;
  await anularPago(e.propietario(), anulado);
  const d = await e.proveedorConCargo();
  nota = (await e.pagar(e.nota(d.proveedor.proveedorId, [{ cargoId: d.cargo, monto: '1120.00' }]))).cuerpo.id;
  otraCuenta = await cuentaConFondos(e.propietario(), 'Otra cuenta');
  const f = await e.proveedorConCargo();
  enOtraCuenta = (
    await e.pagar({
      ...e.cheque(f.proveedor.proveedorId, [{ cargoId: f.cargo, monto: '1120.00' }]),
      chequeraId: otraCuenta.chequeraId,
    })
  ).cuerpo.id;
  const g = await e.proveedorConCargo();
  retiroId = (await registrarRetiro(e.propietario(), retiroConCheque(e, '2000.00'))).id;
  efectivo = await sembrarPagoDelRetiro(retiroId, g.cargo, { monto: '300.00' });
});

describe('por omisión', () => {
  it('trae los vigentes, con su proveedor, contraseñas, forma, documento bancario y posfechado', async () => {
    const pagina = await lista();

    expect(ids(pagina)).toEqual([cheque.id, posfechado, nota, efectivo, enOtraCuenta].sort());
    const fila = pagina.elementos.find(({ id }) => id === cheque.id)!;
    expect(fila).toMatchObject({ numero: cheque.numero, forma: 'cheque', monto: '1620.00', posfechado: false });
    expect(fila.contrasenas).toHaveLength(2);
    expect(fila.movimiento).toMatchObject({ cuentaBancariaNombre: 'Cuenta de pagos', numero: expect.any(Number) });
    expect(pagina.elementos.find(({ id }) => id === posfechado)!.posfechado).toBe(true);
  });

  it('del más nuevo al más viejo y con el total aparte de la página', async () => {
    const segunda = await lista('?limite=2&pagina=2');

    expect(segunda.elementos).toHaveLength(2);
    expect(segunda.total).toBe(5);
  });
});

describe('filtros', () => {
  it('por estado: anulados y todos', async () => {
    expect(ids(await lista('?estado=anulado'))).toEqual([anulado]);
    expect((await lista('?estado=todos')).total).toBe(6);
  });

  it('por proveedor, por contraseña (cualquiera de las del pago) y por forma', async () => {
    expect(ids(await lista(`?proveedorId=${proveedorA.proveedorId}`))).toEqual([cheque.id]);
    for (const { id } of cheque.contrasenas) expect(ids(await lista(`?contrasenaId=${id}`))).toEqual([cheque.id]);
    expect(ids(await lista('?forma=nota_de_debito'))).toEqual([nota]);
    expect(ids(await lista('?forma=efectivo'))).toEqual([efectivo]);
  });

  it('por posfechado: solo los cheques comprometidos, o todo lo demás', async () => {
    expect(ids(await lista('?posfechado=true'))).toEqual([posfechado]);
    expect((await lista('?posfechado=false&estado=todos')).total).toBe(5);
  });

  it('por fechas del pago y por cuenta bancaria', async () => {
    expect(ids(await lista(`?desde=${haceDias(-1)}`))).toEqual([posfechado]);
    expect((await lista(`?hasta=${haceDias(1)}`)).total).toBe(0);
    expect(ids(await lista(`?cuentaBancariaId=${otraCuenta.cuentaBancariaId}`))).toEqual([enOtraCuenta]);
  });

  it('por retiro: el pago en efectivo trae el retiro y el custodio', async () => {
    const pagina = await lista(`?retiroId=${retiroId}`);

    expect(ids(pagina)).toEqual([efectivo]);
    expect(pagina.elementos[0]).toMatchObject({
      forma: 'efectivo',
      movimiento: null,
      retiro: { custodio: 'Juan Pérez' },
    });
  });

  it('un filtro mal escrito se rechaza', async () => {
    expect((await e.propietario().get(`${RUTA}?desde=ayer`)).estado).toBe(400);
    expect((await e.propietario().get(`${RUTA}?forma=trueque`)).estado).toBe(400);
    expect((await e.propietario().get(`${RUTA}?posfechado=quizá`)).estado).toBe(400);
  });
});

describe('permisos', () => {
  it('sin `pagos.ver` ni la lista ni la ficha ni el comprobante', async () => {
    expect((await sinPermiso.get(RUTA)).estado).toBe(403);
    expect((await sinPermiso.get(`${RUTA}/${cheque.id}`)).estado).toBe(403);
    expect((await sinPermiso.get(`${RUTA}/${cheque.id}/comprobante`)).estado).toBe(403);
  });
});
