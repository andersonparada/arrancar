import { asc, eq } from 'drizzle-orm';
import { bd } from '../base-datos/conexion.js';
import { departamentos, municipios } from '../esquemas/geografia.esquema.js';

export type Departamento = typeof departamentos.$inferSelect;
export type Municipio = typeof municipios.$inferSelect;

export const geografiaRepositorio = {
  listarDepartamentos(): Promise<Departamento[]> {
    return bd.select().from(departamentos).orderBy(asc(departamentos.codigo));
  },

  listarMunicipios(departamentoCodigo: string): Promise<Municipio[]> {
    return bd
      .select()
      .from(municipios)
      .where(eq(municipios.departamentoCodigo, departamentoCodigo))
      .orderBy(asc(municipios.codigo));
  },
};
