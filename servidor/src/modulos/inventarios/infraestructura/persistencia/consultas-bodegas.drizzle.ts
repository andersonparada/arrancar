import { and, asc, eq, getTableColumns } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { exigirQueExista } from '../../../core/compartido/infraestructura/exigir-que-exista.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresaUsuarios } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import type { BodegaDto, SolicitudDeBodega } from '../../aplicacion/dto/bodega.dto.js';
import type { ConsultasBodegas } from '../../aplicacion/puertos/consultas-bodegas.js';
import { mapeadorDeBodega } from './bodega.mapeador.js';
import { bodegas } from './bodegas.tablas.js';

const columnas = { ...getTableColumns(bodegas), localidadNombre: localidades.nombre };

type Referencias = Pick<SolicitudDeBodega, 'localidadId' | 'responsableUsuarioId'>;

export class ConsultasBodegasDrizzle implements ConsultasBodegas {
  async listar(): Promise<BodegaDto[]> {
    const filas = await this.consulta().orderBy(asc(bodegas.codigo));
    return filas.map(mapeadorDeBodega.aDto);
  }

  async obtener(bodegaId: string): Promise<BodegaDto> {
    const [fila] = await this.consulta().where(eq(bodegas.id, bodegaId));
    if (!fila) throw new RecursoNoEncontrado('La bodega');
    return mapeadorDeBodega.aDto(fila);
  }

  /** La seguridad por filas oculta lo ajeno; el responsable debe trabajar en la empresa (no basta con que exista). */
  async exigirReferencias({ localidadId, responsableUsuarioId }: Referencias): Promise<void> {
    await exigirQueExista(localidades, localidadId, 'La localidad');
    if (responsableUsuarioId && !(await this.trabajaEnLaEmpresa(responsableUsuarioId)))
      throw new RecursoNoEncontrado('El responsable');
  }

  private async trabajaEnLaEmpresa(usuarioId: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ usuarioId: empresaUsuarios.usuarioId })
      .from(empresaUsuarios)
      .where(and(eq(empresaUsuarios.empresaId, deLaTransaccion.empresa()), eq(empresaUsuarios.usuarioId, usuarioId)));
    return fila !== undefined;
  }

  private consulta() {
    return transaccionEnCurso()
      .select(columnas)
      .from(bodegas)
      .leftJoin(localidades, eq(bodegas.localidadId, localidades.id));
  }
}
