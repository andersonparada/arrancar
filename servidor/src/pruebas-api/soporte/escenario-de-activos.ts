import { expect } from 'vitest';
import type { CuentaDePrueba } from './escenarios.js';

/** Datos válidos para dar de alta un activo (un vehículo en construcción); `claseId` lo pone cada prueba. */
export const datosDeActivo = (claseId: string, cambios: Record<string, unknown> = {}) => ({
  codigo: null,
  descripcion: 'Tractor John Deere',
  claseId,
  tipoDeRegistro: 'activo',
  origen: 'compra',
  fechaDeAdquisicion: '2026-11-01',
  ...cambios,
});

/** Lo mismo para editar: sin código ni tipo de registro. */
export const edicionDeActivo = (claseId: string, cambios: Record<string, unknown> = {}) => {
  const { codigo: _codigo, tipoDeRegistro: _tipo, ...base } = datosDeActivo(claseId);
  return { ...base, ...cambios };
};

/** El id de una de las clases sugeridas de la cuenta, por su nombre. */
export async function claseDe(cuenta: CuentaDePrueba, nombre: string): Promise<string> {
  const respuesta = await cuenta.propietario.get('/api/activos-fijos/clases');
  const lista = respuesta.cuerpo as Array<{ id: string; nombre: string }>;
  return lista.find((clase) => clase.nombre === nombre)!.id;
}

/** Una localidad y un departamento de esa localidad, creados por el propietario. */
export async function crearUbicaciones(
  cuenta: CuentaDePrueba,
): Promise<{ localidadId: string; departamentoId: string }> {
  const tipos = (await cuenta.propietario.get('/api/empresas/tipos-de-localidad')).cuerpo as Array<{ id: string }>;
  const localidad = await cuenta.propietario.post('/api/empresas/localidades', {
    codigo: 'FINCA',
    nombre: 'Finca La Esperanza',
    tipoId: tipos[0]!.id,
    codigoEstablecimientoSat: null,
    nombreComercialSat: null,
    departamentoCodigo: null,
    municipioCodigo: null,
    direccion: null,
    activo: true,
  });
  expect(localidad.estado).toBe(201);
  const departamento = await cuenta.propietario.post('/api/empresas/departamentos', {
    codigo: 'TALLER',
    nombre: 'Taller',
    localidadId: localidad.cuerpo.id,
    activo: true,
  });
  expect(departamento.estado).toBe(201);
  return { localidadId: localidad.cuerpo.id, departamentoId: departamento.cuerpo.id };
}
