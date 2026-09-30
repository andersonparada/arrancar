import { asc, eq, getTableColumns } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { exigirQueExista } from '../../../core/compartido/infraestructura/exigir-que-exista.js';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  VigenciaDeCombustibleDto,
  SolicitudDeVigenciaDeCombustible,
} from '../../aplicacion/dto/vigencia-de-combustible.dto.js';
import type { ConsultasVigenciasDeCombustible } from '../../aplicacion/puertos/consultas-vigencias-de-combustible.js';
import { mapeadorDeVigenciaDeCombustible } from './vigencia-de-combustible.mapeador.js';
import { vigenciasDeCombustible } from './vigencias-de-combustible.tablas.js';
import { combustibles } from './combustibles.tablas.js';

const combustible = alias(combustibles, 'combustible');

const columnas = { ...getTableColumns(vigenciasDeCombustible), combustibleNombre: combustible.nombre };

export class ConsultasVigenciasDeCombustibleDrizzle implements ConsultasVigenciasDeCombustible {
  async listar(): Promise<VigenciaDeCombustibleDto[]> {
    const filas = await this.consulta().orderBy(asc(vigenciasDeCombustible.vigenteDesde));
    return filas.map(mapeadorDeVigenciaDeCombustible.aDto);
  }

  async obtener(vigenciaDeCombustibleId: string): Promise<VigenciaDeCombustibleDto> {
    const [fila] = await this.consulta().where(eq(vigenciasDeCombustible.id, vigenciaDeCombustibleId));
    if (!fila) throw new RecursoNoEncontrado('La vigencia de combustible');
    return mapeadorDeVigenciaDeCombustible.aDto(fila);
  }

  /** Lo elegido debe existir y ser de la empresa: la seguridad por filas oculta lo ajeno. */
  async exigirReferencias(solicitud: SolicitudDeVigenciaDeCombustible): Promise<void> {
    await exigirQueExista(combustibles, solicitud.combustibleId, 'El combustible');
  }

  private consulta() {
    return transaccionEnCurso()
      .select(columnas)
      .from(vigenciasDeCombustible)
      .leftJoin(combustible, eq(vigenciasDeCombustible.combustibleId, combustible.id));
  }
}
