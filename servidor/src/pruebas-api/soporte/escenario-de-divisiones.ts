import { expect } from 'vitest';
import { comoPropietario } from './consultas-de-propietario.js';
import { datosDeActivo } from './escenario-de-activos.js';
import type { CuentaDePrueba } from './escenarios.js';

export const ACTIVOS = '/api/activos-fijos/activos';
export const DIVISIONES = '/api/activos-fijos/divisiones';
export const DEPRECIACION = '/api/activos-fijos/depreciacion';

/**
 * Un grupo de `cantidad` piezas con su costo, puesto en uso el 10 de septiembre de 2026 con contable a 60 meses y fiscal
 * al 20 %, sin residual: el ejemplo de §7.6 de Activos fijos con septiembre y octubre por cerrar.
 */
export async function grupoEnUso(
  cuenta: CuentaDePrueba,
  claseId: string,
  { cantidad, monto }: { cantidad: number; monto: string },
): Promise<string> {
  const creado = await cuenta.propietario.post(
    ACTIVOS,
    datosDeActivo(claseId, { descripcion: 'Silla apilable', cantidad, fechaDeAdquisicion: '2026-09-01' }),
  );
  expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);
  const id = creado.cuerpo.id as string;
  await cuenta.propietario.post(`${ACTIVOS}/${id}/costos`, {
    claseDeCosto: 'adquisicion',
    fecha: '2026-09-05',
    monto,
    documentoDeSoporte: 'Factura 100',
  });
  const puesto = await cuenta.propietario.post(`${ACTIVOS}/${id}/poner-en-uso`, {
    fechaDeInicioDeUso: '2026-09-10',
    porcentajeFiscal: '20.00',
    vidaUtilContableMeses: 60,
    valorResidual: '0.00',
  });
  expect(puesto.estado, JSON.stringify(puesto.cuerpo)).toBe(200);
  return id;
}

export async function cerrarMes(cuenta: CuentaDePrueba, periodo: string): Promise<void> {
  const cierre = await cuenta.propietario.post(`${DEPRECIACION}/${periodo}/cerrar`, {});
  expect(cierre.estado, JSON.stringify(cierre.cuerpo)).toBe(200);
}

export const ficha = async (cuenta: CuentaDePrueba, id: string) =>
  (await cuenta.propietario.get(`${ACTIVOS}/${id}`)).cuerpo;

export const dividir = (cuenta: CuentaDePrueba, id: string, cambios: Record<string, unknown> = {}) =>
  cuenta.propietario.post(`${ACTIVOS}/${id}/dividir`, {
    cantidad: 20,
    fecha: '2026-11-10',
    motivo: 'Entrega parcial',
    ...cambios,
  });

type Tramo = Record<string, string | number | null>;

/** Los tramos vigentes de la ficha, de un libro, con su causa y su cuota mensual. */
export async function tramosDe(cuenta: CuentaDePrueba, id: string, libro: 'contable' | 'fiscal'): Promise<Tramo[]> {
  const { tramos } = await ficha(cuenta, id);
  return (tramos as Tramo[]).filter((tramo) => tramo.libro === libro);
}

export const cuotasDe = (activoId: string, libro: 'contable' | 'fiscal') =>
  comoPropietario<{ periodo: string; monto: string }>(
    'select periodo::text, monto from activos_fijos.cuotas where activo_id = $1 and libro = $2 and vigente order by periodo',
    [activoId, libro],
  );

export const auditoriaDe = (registroId: string, accion: string) =>
  comoPropietario<{ anterior: Record<string, unknown>; motivo: string | null }>(
    "select anterior, motivo from core.auditoria where recurso = 'activos-fijos.divisiones' and accion = $1 and registro_id = $2",
    [accion, registroId],
  );
