/**
 * Los textos opcionales con restricción en la tabla (sin espacios a los lados, de 1 a N caracteres) nunca dan 500:
 * vacío o solo espacios se guarda como nulo (o se rechaza con 400 por campo si el texto es obligatorio) y los espacios
 * a los lados se recortan. Cubre pagos, retiros, reintegros, ajustes y contraseñas.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { efectivoDe, notaConSaldoLibre } from './soporte/cuentas-por-pagar-reintegros.js';
import { retiroConCheque, retiroConNota, RUTA_DE_RETIROS } from './soporte/cuentas-por-pagar-retiros.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxptextosopc');
});

const CASOS: Array<[string, string]> = [
  ['vacío', ''],
  ['solo espacios', '   '],
  ['con espacios a los lados', ' hola '],
];

/** Nunca 500: guardado (201) o rechazado por campo (400). */
const sinError500 = (respuesta: { estado: number; cuerpo: unknown }) => {
  expect([200, 201, 400], JSON.stringify(respuesta.cuerpo)).toContain(respuesta.estado);
};

describe.each(CASOS)('pagos con referencia y observaciones: %s', (_caso, texto) => {
  it('con cheque o nota de débito', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const lineas = [{ cargoId: cargo, monto: '100.00' }];
    const cambios = { referencia: texto, observaciones: texto };

    sinError500(await e.pagar(e.cheque(proveedor.proveedorId, lineas, cambios)));
    sinError500(await e.pagar(e.nota(proveedor.proveedorId, lineas, cambios)));
  });

  it('al anular con motivo', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = await e.pagar(e.nota(proveedor.proveedorId, [{ cargoId: cargo, monto: '100.00' }]));
    expect(pago.estado, JSON.stringify(pago.cuerpo)).toBe(201);

    sinError500(await e.propietario().post(`/api/cuentas-por-pagar/pagos/${pago.cuerpo.id}/anular`, { motivo: texto }));
  });
});

describe.each(CASOS)('retiros y reintegros: %s', (_caso, texto) => {
  it('el retiro con cheque o con nota de débito', async () => {
    const campos = { custodio: texto, observaciones: texto };

    sinError500(await e.propietario().post(RUTA_DE_RETIROS, retiroConCheque(e, '10.00', campos)));
    sinError500(await e.propietario().post(RUTA_DE_RETIROS, retiroConNota(e, '10.00', { observaciones: texto })));
  });

  it('el reintegro en efectivo', async () => {
    const proveedor = await e.mundo.unProveedor();
    const nota = await notaConSaldoLibre(e, proveedor);
    const cuerpo = efectivoDe(proveedor.proveedorId, [{ notaId: nota.notaPropia, monto: '10.00' }], {
      referencia: texto,
      observaciones: texto,
    });

    sinError500(await e.propietario().post('/api/cuentas-por-pagar/reintegros', cuerpo));
  });
});

describe.each(CASOS)('ajustes y contraseñas: %s', (_caso, texto) => {
  it('el ajuste con referencia y motivo', async () => {
    const nota = await notaConSaldoLibre(e, await e.mundo.unProveedor());

    const respuesta = await e.propietario().post(`/api/cuentas-por-pagar/documentos/${nota.notaPropia}/ajustes`, {
      monto: '10.00',
      causa: 'no_recuperable',
      motivo: texto,
      referencia: texto,
    });

    sinError500(respuesta);
  });

  it('la contraseña con observaciones', async () => {
    const proveedor = await e.mundo.unProveedor();
    const cargo = await e.cargoAutorizado(proveedor);

    const respuesta = await e.propietario().post('/api/cuentas-por-pagar/contrasenas', {
      proveedorId: proveedor.proveedorId,
      fechaDePago: '2090-01-01',
      documentos: [cargo],
      observaciones: texto,
    });

    sinError500(respuesta);
  });
});
