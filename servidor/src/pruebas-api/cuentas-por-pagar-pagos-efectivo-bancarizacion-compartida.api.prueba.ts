/**
 * La bancarización compartida (CCL-BZ): el pago en efectivo de Cuentas por pagar ve lo que otro módulo dijo haber pagado al
 * mismo proveedor en el mes (la pregunta `libro-de-compras.pagado_al_proveedor_en_el_mes`). Un destino de prueba responde en
 * nombre de Caja chica; sin su respuesta el resultado es el de siempre (CP4-E3).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../modulos/core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { pagoEnEfectivo, repartirBien, repartirMal, unRetiro } from './soporte/cuentas-por-pagar-efectivo.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let sinExcepcion: ClienteApi;
/** Lo que el destino de prueba dice haber pagado, por proveedor; sin entrada responde `null`. */
const pagadoPorElDestino = new Map<string, number>();

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxpefectivobanccomp');
  await e.fondear('100000.00');
  sinExcepcion = await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
    nombres: 'Sin excepción',
    apellidos: 'Compartida',
    permisos: ['cuentas-por-pagar.retiros.ver', 'cuentas-por-pagar.pagos.pagar-en-efectivo'],
  });
  mediador.responder('terceros', 'libro-de-compras.pagado_al_proveedor_en_el_mes', async ({ proveedorId }) => {
    const efectivoCentavos = pagadoPorElDestino.get(proveedorId);
    if (efectivoCentavos === undefined) return null;
    return { efectivoCentavos, bancarizadoCentavos: 0, comprobantes: ['Caja chica F, vale 1'] };
  });
});

afterAll(() => pagadoPorElDestino.clear());

/** Un proveedor con un cargo de Q2,000 listo para pagar y un retiro con efectivo de sobra. */
async function proveedorConUnCargoChico() {
  const proveedor = await e.mundo.unProveedor();
  const cargoId = await e.cargoAutorizado(proveedor, '2000.00');
  await e.contrasena(proveedor, [cargoId]);
  return { proveedor, cargoId, retiro: await unRetiro(e, '5000.00') };
}

describe('pago en efectivo de Cuentas por pagar con lo pagado por otro módulo', () => {
  it('lo que otro módulo pagó en el mes al proveedor lo lleva al umbral y se rechaza', async () => {
    const { proveedor, cargoId, retiro } = await proveedorConUnCargoChico();
    pagadoPorElDestino.set(proveedor.proveedorId, 2_950_000);
    const pagos = [pagoEnEfectivo(proveedor.proveedorId, [{ cargoId, monto: '1000.00' }])];

    const error = await repartirMal(sinExcepcion, retiro.id, {
      pagos,
      estado: 422,
      codigo: 'efectivo_sobre_el_umbral',
    });

    expect(error.mensaje).toContain('llega a Q30,500.00');
    expect(error.mensaje).toContain('Arrancar solo suma los pagos registrados en Arrancar.');
  });

  it('si el otro módulo no dice nada, el mismo pago pasa como siempre', async () => {
    const { proveedor, cargoId, retiro } = await proveedorConUnCargoChico();
    const pagos = [pagoEnEfectivo(proveedor.proveedorId, [{ cargoId, monto: '1000.00' }])];

    const respuesta = await repartirBien(e.propietario(), retiro.id, pagos);

    expect(respuesta.pagos[0].motivoSinBancarizar).toBeNull();
    expect(respuesta.pagos[0].avisos.join(' ')).not.toContain('Bancarización');
  });
});
