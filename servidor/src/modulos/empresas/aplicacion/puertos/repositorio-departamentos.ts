import type { Departamento, DepartamentoId } from '../../dominio/departamento.js';

/** Guarda y recupera los departamentos para modificarlos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioDepartamentos {
  buscar(id: DepartamentoId): Promise<Departamento | null>;
  agregar(departamento: Departamento): Promise<void>;
  guardar(departamento: Departamento): Promise<void>;
  eliminar(departamento: Departamento): Promise<void>;
}
