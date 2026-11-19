import { asc, eq, getTableColumns } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { exigirQueExista } from '../../../core/compartido/infraestructura/exigir-que-exista.js';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { InmuebleDto, SolicitudDeInmueble } from '../../aplicacion/dto/inmueble.dto.js';
import type { ConsultasInmuebles } from '../../aplicacion/puertos/consultas-inmuebles.js';
import { mapeadorDeInmueble } from './inmueble.mapeador.js';
import { inmuebles } from './inmuebles.tablas.js';
import { localidades } from './localidades.tablas.js';

const localidad = alias(localidades, 'localidad');

const columnas = { ...getTableColumns(inmuebles), localidadNombre: localidad.nombre };

export class ConsultasInmueblesDrizzle implements ConsultasInmuebles {
  async listar(): Promise<InmuebleDto[]> {
    const filas = await this.consulta().orderBy(asc(inmuebles.nombre));
    return filas.map(mapeadorDeInmueble.aDto);
  }

  async obtener(inmuebleId: string): Promise<InmuebleDto> {
    const [fila] = await this.consulta().where(eq(inmuebles.id, inmuebleId));
    if (!fila) throw new RecursoNoEncontrado('El inmueble');
    return mapeadorDeInmueble.aDto(fila);
  }

  /** Lo elegido debe existir y ser de la empresa: la seguridad por filas oculta lo ajeno. */
  async exigirReferencias(solicitud: SolicitudDeInmueble): Promise<void> {
    await exigirQueExista(localidades, solicitud.localidadId, 'La localidad');
  }

  private consulta() {
    return transaccionEnCurso()
      .select(columnas)
      .from(inmuebles)
      .leftJoin(localidad, eq(inmuebles.localidadId, localidad.id));
  }
}
