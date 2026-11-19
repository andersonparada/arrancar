/**
 * Hallazgos de la QA de punta a punta de Activos fijos e Inventarios (2026-11-19) que quedan abiertos.
 * Cada `it.fails` fija un error conocido: cuando se corrija, la prueba fallará y habrá que quitarle el `.fails`.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { claseDe, datosDeActivo } from './soporte/escenario-de-activos.js';

const RUTA = '/api/activos-fijos/activos';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let vehiculosId: string;

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Hallazgos QA AF',
    usuario: 'propietarioqaafinv',
    modulos: ['terceros', 'libro-de-compras', 'activos-fijos'],
  });
  vehiculosId = await claseDe(cuenta, 'Vehículos');
});

describe('valor como ganado común', () => {
  it.fails('solo lo lleva un reproductor: una camioneta con valor como ganado común se rechaza', async () => {
    const respuesta = await cuenta.propietario.post(
      RUTA,
      datosDeActivo(vehiculosId, { valorComoGanadoComun: '5000.00' }),
    );

    expect(respuesta.estado).toBeGreaterThanOrEqual(400);
    expect(respuesta.estado).toBeLessThan(500);
  });
});
