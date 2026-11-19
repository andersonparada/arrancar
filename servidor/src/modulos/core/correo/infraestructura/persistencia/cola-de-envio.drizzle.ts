import { sql } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import type {
  ColaDeEnvio,
  CorreoPorEnviar,
  DepuradorDeCorreos,
  DestinatarioPorEnviar,
  Resolucion,
  ResultadoDeDepuracionDeCorreos,
} from '../../aplicacion/puertos/cola-de-envio.js';

interface FilaPorEnviar extends Record<string, unknown> {
  id: string;
  empresa_id: string;
  asunto: string;
  cuerpo_texto: string;
  cuerpo_html: string;
  nombre_visible: string;
  responder_a: string | null;
  message_id: string;
  intentos: number;
  destinatarios: DestinatarioPorEnviar[];
  adjunto_ruta: string | null;
  adjunto_nombre: string | null;
}

function aCorreoPorEnviar(fila: FilaPorEnviar): CorreoPorEnviar {
  return {
    id: fila.id,
    empresaId: fila.empresa_id,
    asunto: fila.asunto,
    texto: fila.cuerpo_texto,
    html: fila.cuerpo_html,
    nombreVisible: fila.nombre_visible,
    responderA: fila.responder_a,
    messageId: fila.message_id,
    intentos: fila.intentos,
    destinatarios: fila.destinatarios,
    adjuntoRuta: fila.adjunto_ruta,
    adjuntoNombre: fila.adjunto_nombre,
  };
}

/**
 * La bandeja para el trabajador, que atiende a todas las empresas: sin unidad de trabajo ni variables de empresa,
 * solo por las funciones `security definer` de la migración 0026 (cada llamada es atómica).
 */
export class ColaDeEnvioDrizzle implements ColaDeEnvio, DepuradorDeCorreos {
  constructor(private readonly bd: BaseDatos) {}

  async tomar(limite: number, minutosDeArriendo: number): Promise<CorreoPorEnviar[]> {
    const { rows } = await this.bd.execute<FilaPorEnviar>(
      sql`select * from core.tomar_correos_pendientes(${limite}, ${minutosDeArriendo})`,
    );
    return rows.map(aCorreoPorEnviar);
  }

  async resolver({ id, resultado, codigo, rechazados, duracionMs }: Resolucion): Promise<string> {
    const lista = sql.join(
      rechazados.map((direccion) => sql`${direccion}`),
      sql`, `,
    );
    const { rows } = await this.bd.execute<{ estado: string }>(
      sql`select core.resolver_correo(${id}::uuid, ${resultado}, ${codigo}, array[${lista}]::text[], ${Math.round(duracionMs)}) as estado`,
    );
    return (rows[0] as { estado: string }).estado;
  }

  async depurar(diasDelContenido: number, mesesDeLosMetadatos: number): Promise<ResultadoDeDepuracionDeCorreos> {
    const { rows } = await this.bd.execute<ResultadoDeDepuracionDeCorreos & Record<string, unknown>>(
      sql`select * from core.depurar_correos(${diasDelContenido}, ${mesesDeLosMetadatos})`,
    );
    const fila = rows[0] as ResultadoDeDepuracionDeCorreos;
    return { contenido: fila.contenido, filas: fila.filas };
  }
}
