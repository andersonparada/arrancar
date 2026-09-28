import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { DatoInvalido } from '../../compartido/dominio/errores.js';
import { proteger } from '../../compartido/http/guardias.js';
import { operadorDe } from '../../compartido/http/operador-de-la-solicitud.js';
import type { IntercambioDeRecurso } from '../aplicacion/intercambio-de-recurso.js';
import type { Validador } from '../aplicacion/lectura-de-filas.js';

type Aplicacion = Parameters<FastifyPluginAsyncZod>[0];

const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export class FaltaElArchivo extends DatoInvalido {
  readonly codigo = 'falta_el_archivo';

  constructor() {
    super('Adjunte el archivo de Excel.');
  }
}

export interface OpcionesDeIntercambio {
  /** La ruta del recurso: `/ganado/animales`. */
  ruta: string;
  /** Para el nombre del archivo: `animales` → `animales-2026-09-28.xlsx`. */
  archivo: string;
  permisos: { importar: string; exportar: string };
  /** Lo que se usa del intercambio; sus tipos de registro y solicitud no le importan a las rutas. */
  intercambio: Pick<IntercambioDeRecurso<unknown, unknown>, 'exportar' | 'plantilla' | 'importar'>;
}

/** El esquema Zod de la solicitud, como validador de filas importadas. */
export const validadorDeZod =
  <Esquema extends z.ZodType>(esquema: Esquema): Validador<z.output<Esquema>> =>
  (datos) => {
    const resultado = esquema.safeParse(datos);
    if (resultado.success) return { datos: resultado.data };
    return {
      errores: resultado.error.issues.map(({ path, message }) => ({ campo: String(path[0] ?? ''), mensaje: message })),
    };
  };

const hoy = () => new Date().toISOString().slice(0, 10);

function enviarExcel(respuesta: FastifyReply, nombre: string, contenido: Buffer) {
  return respuesta
    .header('Content-Type', TIPO_EXCEL)
    .header('Content-Disposition', `attachment; filename="${nombre}.xlsx"`)
    .send(contenido);
}

async function leerArchivo(solicitud: FastifyRequest): Promise<Buffer> {
  const parte = await solicitud.file();
  if (!parte) throw new FaltaElArchivo();
  return parte.toBuffer();
}

const esquemaDeImportacion = z.object({ ensayo: z.enum(['true', 'false']).default('true') });

/**
 * Las rutas para exportar, bajar la plantilla e importar un recurso, cada una
 * con su permiso: ver una lista no da derecho a llevársela entera.
 */
export function rutasDeIntercambio(app: Aplicacion, { ruta, archivo, permisos, intercambio }: OpcionesDeIntercambio) {
  const exportar = proteger({ permiso: permisos.exportar });
  const importar = proteger({ permiso: permisos.importar });
  app.get(`${ruta}/exportar`, { preHandler: exportar }, async (solicitud, respuesta) =>
    enviarExcel(respuesta, `${archivo}-${hoy()}`, await intercambio.exportar(operadorDe(solicitud))),
  );
  app.get(`${ruta}/plantilla`, { preHandler: importar }, async (_solicitud, respuesta) =>
    enviarExcel(respuesta, `plantilla-${archivo}`, await intercambio.plantilla()),
  );
  app.post(
    `${ruta}/importar`,
    { schema: { querystring: esquemaDeImportacion }, preHandler: importar },
    async (solicitud) =>
      intercambio.importar(operadorDe(solicitud), {
        contenido: await leerArchivo(solicitud),
        ensayo: solicitud.query.ensayo === 'true',
      }),
  );
}
