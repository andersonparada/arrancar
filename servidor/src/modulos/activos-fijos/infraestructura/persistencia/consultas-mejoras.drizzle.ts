import { desc, eq, sql, type SQL } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { MejoraDto } from '../../aplicacion/dto/mejora.dto.js';
import type { ConsultasMejoras } from '../../aplicacion/puertos/consultas-mejoras.js';
import { costos } from './costos.tablas.js';
import { mejoras } from './mejoras.tablas.js';

/** La columna de la mejora de afuera, con su tabla: dentro de la subconsulta `id` sin tabla sería el del costo. */
const idDeLaMejora = sql.raw('"activos_fijos"."mejoras"."id"');

/** Lo vigente de los costos de cada mejora: cuánto suman y cuántos son. */
const montoVigente = sql<string>`coalesce((select sum(c.monto) from ${costos} c where c.mejora_id = ${idDeLaMejora} and c.estado = 'vigente'), 0)`;
const cantidadVigente = sql<number>`(select count(*)::int from ${costos} c where c.mejora_id = ${idDeLaMejora} and c.estado = 'vigente')`;

const columnas = {
  id: mejoras.id,
  activoId: mejoras.activoId,
  numero: mejoras.numero,
  anioDeNumero: mejoras.anioDeNumero,
  clase: mejoras.clase,
  fecha: mejoras.fecha,
  descripcion: mejoras.descripcion,
  vidaUtilRestanteContableMeses: mejoras.vidaUtilRestanteContableMeses,
  noEsEdificacion: mejoras.noEsEdificacion,
  estado: mejoras.estado,
  anuladaEn: mejoras.anuladaEn,
  motivoDeAnulacion: mejoras.motivoDeAnulacion,
  monto: montoVigente,
  cantidadDeCostos: cantidadVigente,
};

type Fila = Awaited<ReturnType<ConsultasMejorasDrizzle['filas']>>[number];

function aDto({ anuladaEn, monto, ...fila }: Fila): MejoraDto {
  return { ...fila, anuladaEn: anuladaEn?.toISOString() ?? null, monto: deCentavos(aCentavos(monto)) };
}

/** Lecturas de las mejoras y costos posteriores. */
export class ConsultasMejorasDrizzle implements ConsultasMejoras {
  async obtener(mejoraId: string): Promise<MejoraDto> {
    const [fila] = await this.filas(eq(mejoras.id, mejoraId));
    if (!fila) throw new RecursoNoEncontrado('La mejora');
    return aDto(fila);
  }

  async deActivo(activoId: string): Promise<MejoraDto[]> {
    return (await this.filas(eq(mejoras.activoId, activoId))).map(aDto);
  }

  async filas(donde: SQL) {
    return transaccionEnCurso()
      .select(columnas)
      .from(mejoras)
      .where(donde)
      .orderBy(desc(mejoras.fecha), desc(mejoras.creadoEn));
  }
}
