import { sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { UsoDeCupos } from '../../dominio/cupos-de-correo.js';
import type { CorreoNuevo, RepositorioDeCorreos } from '../../aplicacion/puertos/repositorio-de-correos.js';
import { correosSalientes } from './correos-salientes.tablas.js';
import { destinatariosDeCorreos } from './destinatarios-de-correos.tablas.js';

interface FilaDeCupo extends Record<string, unknown> {
  por_hora: number;
  por_dia: number;
  de_la_instalacion_por_hora: number;
  por_destinatario: Record<string, number>;
}

/**
 * La bandeja dentro de la unidad de trabajo en curso: RLS la limita a la empresa de la transacción, y la empresa y la
 * cuenta salen de ella (valores por omisión de las columnas).
 */
export class RepositorioDeCorreosDrizzle implements RepositorioDeCorreos {
  async reservarCupo(direcciones: readonly string[]): Promise<UsoDeCupos> {
    const lista = sql.join(
      direcciones.map((direccion) => sql`${direccion}`),
      sql`, `,
    );
    const { rows } = await transaccionEnCurso().execute<FilaDeCupo>(
      sql`select * from core.reservar_cupo_de_correo(array[${lista}]::text[])`,
    );
    const fila = rows[0] as FilaDeCupo;
    return {
      porHora: fila.por_hora,
      porDia: fila.por_dia,
      deLaInstalacionPorHora: fila.de_la_instalacion_por_hora,
      porDestinatario: fila.por_destinatario,
    };
  }

  async insertar(correo: CorreoNuevo): Promise<string> {
    const transaccion = transaccionEnCurso();
    const [creado] = await transaccion
      .insert(correosSalientes)
      .values(aFilaDeCorreo(correo))
      .returning({ id: correosSalientes.id });
    const id = (creado as { id: string }).id;
    await transaccion.insert(destinatariosDeCorreos).values(
      correo.destinatarios.map((destinatario) => ({
        correoSalienteId: id,
        clase: destinatario.clase,
        direccion: destinatario.direccion.valor,
        nombre: destinatario.nombre,
        origen: destinatario.origen,
        origenId: destinatario.origenId,
      })),
    );
    return id;
  }
}

function aFilaDeCorreo(correo: CorreoNuevo): typeof correosSalientes.$inferInsert {
  return {
    tipo: correo.tipo,
    recursoOrigen: correo.origen.recurso,
    registroOrigenId: correo.origen.registroId,
    asunto: correo.asunto,
    cuerpoTexto: correo.texto,
    cuerpoHtml: correo.html,
    responderA: correo.responderA,
    nombreVisible: correo.nombreVisible,
    adjuntoArchivoId: correo.adjunto?.archivoId ?? null,
    adjuntoNombre: correo.adjunto?.nombre ?? null,
    adjuntoSha256: correo.adjunto?.sha256 ?? null,
    messageId: correo.messageId,
  };
}
