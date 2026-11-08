import { and, asc, eq, ne } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { EmpresaDto } from '../../aplicacion/dto/empresa.dto.js';
import type { ConsultasEmpresas } from '../../aplicacion/puertos/consultas-empresas.js';
import { mapeadorDeEmpresa } from './empresa.mapeador.js';

export class ConsultasEmpresasDrizzle implements ConsultasEmpresas {
  async listarDeCuenta(cuentaId: string): Promise<EmpresaDto[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(empresas)
      .where(eq(empresas.cuentaId, cuentaId))
      .orderBy(asc(empresas.nombre));
    return filas.map(mapeadorDeEmpresa.aDto);
  }

  async nitRepetidoEnCuenta(consulta: { cuentaId: string; nit: string; excluirEmpresaId: string }): Promise<boolean> {
    const filas = await transaccionEnCurso()
      .select({ id: empresas.id })
      .from(empresas)
      .where(
        and(
          eq(empresas.cuentaId, consulta.cuentaId),
          eq(empresas.nit, consulta.nit),
          ne(empresas.id, consulta.excluirEmpresaId),
        ),
      )
      .limit(1);
    return filas.length > 0;
  }

  async obtenerEnCuenta(empresaId: string, cuentaId: string): Promise<EmpresaDto> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(empresas)
      .where(and(eq(empresas.id, empresaId), eq(empresas.cuentaId, cuentaId)));
    if (!fila) throw new RecursoNoEncontrado('La empresa');
    return mapeadorDeEmpresa.aDto(fila);
  }
}
