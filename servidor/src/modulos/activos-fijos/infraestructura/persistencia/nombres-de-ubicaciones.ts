import type { UbicacionesEnEmpresas } from './ubicaciones-en-empresas.drizzle.js';

interface FilaConUbicacion {
  localidadId: string | null;
  departamentoId: string | null;
}

/** Cómo se llama la localidad o el departamento de una fila; nulo si no tiene. */
export interface NombresDeUbicaciones {
  localidad(id: string | null): string | null;
  departamento(id: string | null): string | null;
}

const sinRepetir = (ids: (string | null)[]): string[] => [...new Set(ids.filter((id): id is string => id !== null))];

/** Trae de una vez los nombres de las localidades y departamentos de las filas (AF-P22 b). */
export async function nombresDeUbicaciones(
  ubicaciones: UbicacionesEnEmpresas,
  filas: readonly FilaConUbicacion[],
): Promise<NombresDeUbicaciones> {
  const [localidades, departamentos] = await Promise.all([
    ubicaciones.localidades(sinRepetir(filas.map((fila) => fila.localidadId))),
    ubicaciones.departamentos(sinRepetir(filas.map((fila) => fila.departamentoId))),
  ]);
  const por = (lista: readonly { id: string; nombre: string }[]) => (id: string | null) =>
    lista.find((elemento) => elemento.id === id)?.nombre ?? null;
  return { localidad: por(localidades), departamento: por(departamentos) };
}
