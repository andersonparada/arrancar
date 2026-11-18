/**
 * El recibo de un reparto de efectivo (CP4-E4): un recibo por proveedor, con su pago agrupado por contraseña, el custodio
 * del retiro, el total en letras y la leyenda de que no es un documento tributario.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { pagoEnEfectivo, repartirBien, unRetiro } from './soporte/cuentas-por-pagar-efectivo.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxppagosrecibo');
});

const comprobante = async (id: string) => {
  const respuesta = await e.propietario().get(`/api/cuentas-por-pagar/pagos/${id}/comprobante`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

describe('el recibo de un reparto de efectivo', () => {
  it('agrupa por contraseña y cada proveedor tiene su recibo con su total en letras', async () => {
    const [uno, dos] = [await e.mundo.unProveedor(), await e.mundo.unProveedor()];
    const [cargoA, cargoB, cargoC] = [
      await e.cargoAutorizado(uno),
      await e.cargoAutorizado(uno, '500.00'),
      await e.cargoAutorizado(dos, '300.00'),
    ];
    const [k1, k2] = [await e.contrasena(uno, [cargoA]), await e.contrasena(uno, [cargoB])];
    await e.contrasena(dos, [cargoC]);
    const retiro = await unRetiro(e, '3000.00');

    const { pagos } = await repartirBien(e.propietario(), retiro.id, [
      pagoEnEfectivo(uno.proveedorId, [
        { cargoId: cargoA, monto: '1000.00' },
        { cargoId: cargoB, monto: '500.00' },
      ]),
      pagoEnEfectivo(dos.proveedorId, [{ cargoId: cargoC, monto: '300.00' }]),
    ]);

    const primero = await comprobante(pagos[0].id);
    expect(primero).toMatchObject({
      titulo: 'Recibo de pago en efectivo',
      retiro: { custodio: 'Juan Pérez' },
      totalPagado: '1500.00',
      totalEnLetras: 'Mil quinientos quetzales con 00/100',
    });
    const porContrasena = primero.contrasenas.map((c: { id: string; pagado: string }) => [c.id, c.pagado]);
    expect(porContrasena.sort()).toEqual(
      [
        [k1, '1000.00'],
        [k2, '500.00'],
      ].sort(),
    );
    expect(primero.leyendas).toContain('Este recibo no es un documento tributario.');
    expect(await comprobante(pagos[1].id)).toMatchObject({ totalPagado: '300.00', proveedor: { id: dos.proveedorId } });
  });
});
