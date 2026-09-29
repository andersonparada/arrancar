import { asc, eq, getTableColumns } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { exigirQueExista } from '../../../core/compartido/infraestructura/exigir-que-exista.js';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { LocalidadDto, SolicitudDeLocalidad } from '../../aplicacion/dto/localidad.dto.js';
import type { ConsultasLocalidades } from '../../aplicacion/puertos/consultas-localidades.js';
import { mapeadorDeLocalidad } from './localidad.mapeador.js';
import { localidades } from './localidades.tablas.js';
import { tiposDeLocalidad } from './tipos-de-localidad.tablas.js';

const tipo = alias(tiposDeLocalidad, 'tipo');

const columnas = { ...getTableColumns(localidades), tipoNombre: tipo.nombre };

export class ConsultasLocalidadesDrizzle implements ConsultasLocalidades {
  async listar(): Promise<LocalidadDto[]> {
    const filas = await this.consulta().orderBy(asc(localidades.nombre));
    return filas.map(mapeadorDeLocalidad.aDto);
  }

  async obtener(localidadId: string): Promise<LocalidadDto> {
    const [fila] = await this.consulta().where(eq(localidades.id, localidadId));
    if (!fila) throw new RecursoNoEncontrado('La localidad');
    return mapeadorDeLocalidad.aDto(fila);
  }

  /** Lo elegido debe existir y ser de la empresa: la seguridad por filas oculta lo ajeno. */
  async exigirReferencias(solicitud: SolicitudDeLocalidad): Promise<void> {
    await exigirQueExista(tiposDeLocalidad, solicitud.tipoId, 'El tipo de localidad');
  }

  private consulta() {
    return transaccionEnCurso().select(columnas).from(localidades).leftJoin(tipo, eq(localidades.tipoId, tipo.id));
  }
}
