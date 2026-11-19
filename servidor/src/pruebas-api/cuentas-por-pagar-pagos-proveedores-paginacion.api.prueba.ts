/**
 * La lista de proveedores por pagar (CP4-9): con nombres repetidos, el orden es estable (nombre y luego id) y la
 * paginación no repite ni pierde proveedores en el borde de una página.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { nitValido, registrarProveedor } from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
const RUTA = '/api/cuentas-por-pagar/pagos/proveedores-por-pagar';
let e: EscenarioDePagos;
const creados: string[] = [];

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxppagosprovpag');
  for (let i = 0; i < 3; i++) {
    // Las razones sociales son distintas (Terceros no las deja repetidas), pero se muestran con el mismo nombre comercial.
    const { proveedorId } = await registrarProveedor(e.mundo.escenario.cuenta, `Razón ${i} S.A.`, {
      nombreComercial: 'Gemelo Repetido',
      confirmarDuplicado: true,
      secciones: { 'cuentas-por-pagar': { diasDeCredito: 30 } },
    });
    const proveedor = { proveedorId, nitEmisor: nitValido(String(7700000 + i)) };
    const cargo = await e.cargoAutorizado(proveedor);
    await e.contrasena(proveedor, [cargo]);
    creados.push(proveedor.proveedorId);
  }
});

const pagina = async (numero: number, limite: number) => {
  const respuesta = await e.propietario().get(`${RUTA}?pagina=${numero}&limite=${limite}&buscar=Gemelo`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo as { elementos: Array<{ proveedorId: string }>; total: number };
};

describe('proveedores por pagar con el mismo nombre', () => {
  it('paginados de uno en uno salen todos, sin repetir y en orden de id', async () => {
    const vistos: string[] = [];
    for (const numero of [1, 2, 3]) vistos.push(...(await pagina(numero, 1)).elementos.map((p) => p.proveedorId));

    expect(vistos).toHaveLength(3);
    expect([...vistos].sort()).toEqual([...creados].sort());
    expect(vistos).toEqual([...vistos].sort());
  });

  it('el borde de una página de dos no pierde al tercero', async () => {
    const [primera, segunda] = [await pagina(1, 2), await pagina(2, 2)];

    expect(primera.total).toBe(3);
    expect(primera.elementos).toHaveLength(2);
    expect(segunda.elementos).toHaveLength(1);
    expect(new Set([...primera.elementos, ...segunda.elementos].map((p) => p.proveedorId)).size).toBe(3);
  });
});
