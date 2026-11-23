import { expect } from 'vitest';
import type { ClienteApi } from './cliente-api.js';

export const RUTA_DE_PARCELAS = '/api/parcelas/parcelas';

/** Crea una localidad con el cliente dado (que necesita ver y crear localidades y ver los tipos). */
export async function crearLocalidadDePrueba(usuario: ClienteApi, codigo: string): Promise<string> {
  const tipos = (await usuario.get('/api/empresas/tipos-de-localidad')).cuerpo as Array<{ id: string }>;
  const creada = await usuario.post('/api/empresas/localidades', {
    codigo,
    nombre: `Finca ${codigo}`,
    tipoId: tipos[0]!.id,
    codigoEstablecimientoSat: null,
    nombreComercialSat: null,
    departamentoCodigo: null,
    municipioCodigo: null,
    direccion: null,
    activo: true,
  });
  expect(creada.estado).toBe(201);
  return creada.cuerpo.id as string;
}

/** El id del primer tipo de parcela de la empresa (la lista siembra los sugeridos la primera vez). */
export async function tipoDeParcelaDePrueba(usuario: ClienteApi): Promise<string> {
  const tipos = (await usuario.get('/api/parcelas/tipos-de-parcela')).cuerpo as Array<{ id: string; nombre: string }>;
  return tipos.find(({ nombre }) => nombre === 'Potrero')!.id;
}

/** El cuerpo para crear una parcela; cada prueba cambia lo que le interesa. */
export const cuerpoDeParcela = (
  base: { localidadId: string; tipoId: string },
  cambios: Record<string, unknown> = {},
): Record<string, unknown> => ({
  localidadId: base.localidadId,
  tipoId: base.tipoId,
  codigo: 'P-1',
  nombre: 'Potrero 1',
  formaDeTenencia: 'propia',
  ...cambios,
});

/** El cuerpo de una medición en manzanas desde el 1 de enero de 2026. */
export const cuerpoDeMedicion = (cambios: Record<string, unknown> = {}): Record<string, unknown> => ({
  vigenteDesde: '2026-01-01',
  fuente: 'escritura',
  cantidadOriginal: '2',
  unidadOriginal: 'manzana',
  ...cambios,
});
