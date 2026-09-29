import { asc, eq, getTableColumns } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { exigirQueExista } from '../../../core/compartido/infraestructura/exigir-que-exista.js';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { DepartamentoDto, SolicitudDeDepartamento } from '../../aplicacion/dto/departamento.dto.js';
import type { ConsultasDepartamentos } from '../../aplicacion/puertos/consultas-departamentos.js';
import { mapeadorDeDepartamento } from './departamento.mapeador.js';
import { departamentos } from './departamentos.tablas.js';
import { localidades } from './localidades.tablas.js';

const localidad = alias(localidades, 'localidad');

const columnas = { ...getTableColumns(departamentos), localidadNombre: localidad.nombre };

export class ConsultasDepartamentosDrizzle implements ConsultasDepartamentos {
  async listar(): Promise<DepartamentoDto[]> {
    const filas = await this.consulta().orderBy(asc(departamentos.codigo));
    return filas.map(mapeadorDeDepartamento.aDto);
  }

  async obtener(departamentoId: string): Promise<DepartamentoDto> {
    const [fila] = await this.consulta().where(eq(departamentos.id, departamentoId));
    if (!fila) throw new RecursoNoEncontrado('El departamento');
    return mapeadorDeDepartamento.aDto(fila);
  }

  /** Lo elegido debe existir y ser de la empresa: la seguridad por filas oculta lo ajeno. */
  async exigirReferencias(solicitud: SolicitudDeDepartamento): Promise<void> {
    await exigirQueExista(localidades, solicitud.localidadId, 'La localidad');
  }

  private consulta() {
    return transaccionEnCurso()
      .select(columnas)
      .from(departamentos)
      .leftJoin(localidad, eq(departamentos.localidadId, localidad.id));
  }
}
