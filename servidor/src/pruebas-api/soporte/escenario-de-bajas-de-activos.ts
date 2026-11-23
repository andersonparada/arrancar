import { expect } from 'vitest';
import { datosDeActivo } from './escenario-de-activos.js';
import type { CuentaDePrueba } from './escenarios.js';

const ACTIVOS = '/api/activos-fijos/activos';

/** Un activo puesto en uso el 10 de septiembre de 2026 con un costo manual; por omisión, Q250,000.00. */
export async function activoEnUsoDe(
  cuenta: CuentaDePrueba,
  vehiculosId: string,
  opciones: { monto?: string; cambios?: Record<string, unknown> } = {},
): Promise<string> {
  const { monto = '250000.00', cambios = {} } = opciones;
  const creado = await cuenta.propietario.post(
    ACTIVOS,
    datosDeActivo(vehiculosId, { fechaDeAdquisicion: '2026-09-01', ...cambios }),
  );
  expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);
  const id = creado.cuerpo.id as string;
  const costo = await cuenta.propietario.post(`${ACTIVOS}/${id}/costos`, {
    claseDeCosto: 'adquisicion',
    fecha: '2026-09-05',
    monto,
    documentoDeSoporte: 'Escritura 15',
  });
  expect(costo.estado, JSON.stringify(costo.cuerpo)).toBe(201);
  const puesto = await cuenta.propietario.post(`${ACTIVOS}/${id}/poner-en-uso`, { fechaDeInicioDeUso: '2026-09-10' });
  expect(puesto.estado, JSON.stringify(puesto.cuerpo)).toBe(200);
  return id;
}

export const baja = (activoId: string, cambios: Record<string, unknown> = {}) => ({
  activoId,
  fecha: '2026-11-20',
  causa: 'destruccion',
  descripcion: 'Quedó inservible tras el incendio',
  autorizadaPor: 'Gerencia',
  ...cambios,
});

export const DATOS_DE_VENTA = {
  comprador: 'Transportes del Norte, S. A.',
  nitDelComprador: 'CF',
  precio: '100000.00',
  iva: '12000.00',
  serieFel: 'A1B2',
  numeroFel: '98765',
  autorizacionFel: '3f2b6c1a-8d4e-4b7a-9c01-5e6f7a8b9c0d',
};

export const venta = (activoId: string, cambios: Record<string, unknown> = {}) =>
  baja(activoId, { causa: 'venta', descripcion: 'Venta del vehículo usado', venta: DATOS_DE_VENTA, ...cambios });
