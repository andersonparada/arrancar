import { and, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { OrigenDeCorreo } from '../../aplicacion/bandeja-de-salida.js';
import type { CorreoDto, CorreoResumenDto, PaginaDeCorreosDto } from '../../aplicacion/dto/correo.dto.js';
import type {
  Cancelacion,
  FiltroDeCorreos,
  HistorialDeCorreos,
} from '../../aplicacion/puertos/historial-de-correos.js';
import { agruparDestinatarios, aCorreoDto, aResumenDeCorreo } from './correo.mapeador.js';
import { correosSalientes } from './correos-salientes.tablas.js';
import { destinatariosDeCorreos } from './destinatarios-de-correos.tablas.js';

type FilaDeCorreo = typeof correosSalientes.$inferSelect;

const ZONA_HORARIA = 'America/Guatemala';
const fechaLocal = sql`(${correosSalientes.creadoEn} at time zone ${ZONA_HORARIA})::date`;

function condicionesDe(filtro: FiltroDeCorreos): SQL | undefined {
  const condiciones: SQL[] = [];
  if (filtro.desde) condiciones.push(sql`${fechaLocal} >= ${filtro.desde}::date`);
  if (filtro.hasta) condiciones.push(sql`${fechaLocal} <= ${filtro.hasta}::date`);
  if (filtro.estado) condiciones.push(eq(correosSalientes.estado, filtro.estado));
  if (filtro.tipo) condiciones.push(eq(correosSalientes.tipo, filtro.tipo));
  return and(...condiciones);
}

/**
 * El historial de la empresa activa: lo limita la seguridad por filas de `core.correos_salientes`, y la empresa y el
 * usuario salen de la transacción en curso. La app nunca borra; cancelar y reintentar son `update` condicionados.
 */
export class HistorialDeCorreosDrizzle implements HistorialDeCorreos {
  async listar(filtro: FiltroDeCorreos): Promise<PaginaDeCorreosDto> {
    const transaccion = transaccionEnCurso();
    const donde = condicionesDe(filtro);
    const filas = await transaccion
      .select()
      .from(correosSalientes)
      .where(donde)
      .orderBy(desc(correosSalientes.creadoEn), desc(correosSalientes.id))
      .limit(filtro.limite)
      .offset((filtro.pagina - 1) * filtro.limite);
    const [total] = await transaccion.select({ total: count() }).from(correosSalientes).where(donde);
    const elementos = await this.conDestinatarios(filas, aResumenDeCorreo);
    return { elementos, total: total?.total ?? 0, pagina: filtro.pagina, limite: filtro.limite };
  }

  async buscar(id: string): Promise<CorreoDto | null> {
    const filas = await transaccionEnCurso().select().from(correosSalientes).where(eq(correosSalientes.id, id));
    return (await this.conDestinatarios(filas, aCorreoDto))[0] ?? null;
  }

  async deOrigen(origen: OrigenDeCorreo): Promise<CorreoResumenDto[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(correosSalientes)
      .where(
        and(
          eq(correosSalientes.recursoOrigen, origen.recurso),
          eq(correosSalientes.registroOrigenId, origen.registroId),
        ),
      )
      .orderBy(desc(correosSalientes.creadoEn), desc(correosSalientes.id));
    return this.conDestinatarios(filas, aResumenDeCorreo);
  }

  async cancelar(id: string, cancelacion: Cancelacion): Promise<boolean> {
    const cambiados = await this.cancelarDonde(eq(correosSalientes.id, id), cancelacion);
    return cambiados.length > 0;
  }

  async cancelarPendientesDe(origen: OrigenDeCorreo, cancelacion: Cancelacion): Promise<CorreoResumenDto[]> {
    const antes = (await this.deOrigen(origen)).filter((correo) => correo.estado === 'pendiente');
    if (antes.length === 0) return [];
    const cancelados = await this.cancelarDonde(
      inArray(
        correosSalientes.id,
        antes.map((correo) => correo.id),
      ),
      cancelacion,
    );
    const ids = new Set(cancelados.map((fila) => fila.id));
    return antes.filter((correo) => ids.has(correo.id));
  }

  async reintentar(id: string): Promise<boolean> {
    const cambiados = await transaccionEnCurso()
      .update(correosSalientes)
      .set({ estado: 'pendiente', intentos: 0, proximoIntento: new Date(), ultimoErrorCodigo: null })
      .where(and(eq(correosSalientes.id, id), eq(correosSalientes.estado, 'fallido')))
      .returning({ id: correosSalientes.id });
    return cambiados.length > 0;
  }

  private cancelarDonde(donde: SQL, { usuarioId, motivo }: Cancelacion) {
    return transaccionEnCurso()
      .update(correosSalientes)
      .set({ estado: 'cancelado', canceladoEn: new Date(), canceladoPor: usuarioId, motivoDeCancelacion: motivo })
      .where(and(donde, eq(correosSalientes.estado, 'pendiente')))
      .returning({ id: correosSalientes.id });
  }

  private async conDestinatarios<Dto>(
    filas: readonly FilaDeCorreo[],
    aDto: (fila: FilaDeCorreo, destinatarios: CorreoResumenDto['destinatarios']) => Dto,
  ): Promise<Dto[]> {
    if (filas.length === 0) return [];
    const destinatarios = await transaccionEnCurso()
      .select()
      .from(destinatariosDeCorreos)
      .where(
        inArray(
          destinatariosDeCorreos.correoSalienteId,
          filas.map((fila) => fila.id),
        ),
      );
    const agrupados = agruparDestinatarios(destinatarios);
    return filas.map((fila) => aDto(fila, agrupados.get(fila.id) ?? []));
  }
}
