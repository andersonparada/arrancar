import { asc, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  ConsultasGeografia,
  DepartamentoDto,
  MunicipioDto,
} from '../../aplicacion/puertos/consultas-geografia.js';
import { departamentos, municipios } from './geografia.tablas.js';

export class ConsultasGeografiaDrizzle implements ConsultasGeografia {
  listarDepartamentos(): Promise<DepartamentoDto[]> {
    return transaccionEnCurso().select().from(departamentos).orderBy(asc(departamentos.codigo));
  }

  listarMunicipios(departamentoCodigo: string): Promise<MunicipioDto[]> {
    return transaccionEnCurso()
      .select()
      .from(municipios)
      .where(eq(municipios.departamentoCodigo, departamentoCodigo))
      .orderBy(asc(municipios.codigo));
  }
}
