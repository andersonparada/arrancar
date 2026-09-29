import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { auditoria } from '../../../core/compartido/infraestructura/persistencia/auditoria.tablas.js';
import { correlativos } from '../../../core/compartido/infraestructura/persistencia/correlativos.tablas.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import type {
  ConsultasDeCorrelativos,
  ExplicacionPorNumero,
  HuecosPorExplicar,
  RangoDeCorrelativo,
} from '../../aplicacion/puertos/consultas-de-correlativos.js';
import { FUENTES_DE_NUMEROS } from './fuentes-de-numeros.drizzle.js';

const CLAVES = Object.keys(FUENTES_DE_NUMEROS);
const numeroAuditado = sql<number>`(${auditoria.anterior}->>'numero')::int`;
const anioAuditado = sql<number>`coalesce((${auditoria.anterior}->>'anioDeNumero')::int, 0)`;

/** Las bajas y cambios de tipo de esta empresa que dejaron rastro de esos números en la auditoría. */
function condicionesDeLaAuditoria({ clave, anio, huecos }: HuecosPorExplicar) {
  const fuente = FUENTES_DE_NUMEROS[clave]!;
  return and(
    eq(auditoria.empresaId, contextoEnCurso().empresaId),
    eq(auditoria.recurso, fuente.recursoAuditado),
    inArray(auditoria.accion, ['eliminar', 'corregir']),
    inArray(numeroAuditado, huecos),
    eq(anioAuditado, anio),
    fuente.tipo ? sql`${auditoria.anterior}->>'tipo' = ${fuente.tipo}` : undefined,
  );
}

/** Los números de las notas y transferencias de la empresa, sus huecos y lo que la auditoría dice de ellos. */
export class ConsultasDeCorrelativosDrizzle implements ConsultasDeCorrelativos {
  async rangos(clave?: string): Promise<RangoDeCorrelativo[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(correlativos)
      .where(clave ? eq(correlativos.clave, clave) : inArray(correlativos.clave, CLAVES))
      .orderBy(asc(correlativos.clave), asc(correlativos.anio));
    const rangos: RangoDeCorrelativo[] = [];
    for (const fila of filas) rangos.push(await this.rangoDe(fila));
    return rangos;
  }

  async explicaciones(porExplicar: HuecosPorExplicar): Promise<ExplicacionPorNumero[]> {
    const filas = await transaccionEnCurso()
      .select({
        numero: numeroAuditado,
        accion: auditoria.accion,
        usuarioId: auditoria.usuarioId,
        usuarioNombre: sql<string | null>`nullif(trim(${usuarios.nombres} || ' ' || ${usuarios.apellidos}), '')`,
        fecha: auditoria.creadoEn,
        motivo: auditoria.motivo,
      })
      .from(auditoria)
      .leftJoin(usuarios, eq(usuarios.id, auditoria.usuarioId))
      .where(condicionesDeLaAuditoria(porExplicar))
      .orderBy(asc(auditoria.creadoEn));
    return filas.map(({ fecha, accion, ...resto }) => ({
      ...resto,
      accion: accion as 'eliminar' | 'corregir',
      fecha: fecha.toISOString(),
    }));
  }

  private async rangoDe({ clave, anio, siguiente }: typeof correlativos.$inferSelect): Promise<RangoDeCorrelativo> {
    const fuente = FUENTES_DE_NUMEROS[clave]!;
    const ultimo = siguiente - 1;
    const [emitidos, huecos] = await Promise.all([fuente.emitidos(anio), fuente.huecos(anio, ultimo)]);
    return { clave, anio, ultimo, emitidos, huecos };
  }
}
