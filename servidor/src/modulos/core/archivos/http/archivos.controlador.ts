import type { FastifyReply, FastifyRequest } from 'fastify';
import { leerImagenDeSolicitud } from '../../compartido/http/leer-imagen.js';
import { operadorDe } from '../../compartido/http/operador-de-la-solicitud.js';
import type { AbrirImagen } from '../aplicacion/casos-uso/abrir-imagen.js';
import type { SubirImagen } from '../aplicacion/casos-uso/subir-imagen.js';
import type { ConsultaArchivo, ParamsArchivo } from './archivos.esquemas-http.js';

export interface CasosDeUsoDeArchivos {
  subir: SubirImagen;
  abrir: AbrirImagen;
}

type SolicitudDeImagen = FastifyRequest<{ Params: ParamsArchivo; Querystring: ConsultaArchivo }>;

export class ArchivosControlador {
  constructor(private readonly casosDeUso: CasosDeUsoDeArchivos) {}

  subir = async (solicitud: FastifyRequest, respuesta: FastifyReply) => {
    const imagen = await leerImagenDeSolicitud(solicitud);
    const archivo = await this.casosDeUso.subir.ejecutar(operadorDe(solicitud), imagen);
    return respuesta.status(201).send(archivo);
  };

  /** Con caché larga: el contenido de un id nunca cambia. */
  obtener = async (solicitud: SolicitudDeImagen, respuesta: FastifyReply) => {
    const imagen = await this.casosDeUso.abrir.ejecutar(operadorDe(solicitud), {
      archivoId: solicitud.params.archivoId,
      variante: solicitud.query.variante,
    });
    return respuesta
      .header('Content-Type', imagen.tipoMime)
      .header('Cache-Control', 'private, max-age=31536000, immutable')
      .send(imagen.contenido);
  };
}
