import type { FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';
import { LIMITE_DE_BYTES_DE_FOTO_DE_DOCUMENTO } from '../dominio/documento.js';
import {
  FaltaElDocumento,
  leerDocumentoDeSolicitud,
  SubidaConMasDeUnArchivo,
  SubidaDemasiadoGrande,
  SubidaInterrumpida,
} from './leer-documento.js';

interface ParteFalsa {
  truncada?: boolean;
  falla?: NodeJS.ErrnoException;
  campo?: string;
  /** Una segunda parte después de la primera. */
  conOtraParte?: boolean;
}

/** Una petición multipart de mentira: `parts()` entrega la parte que se le indique. */
function solicitudCon(parte: ParteFalsa | null): { solicitud: FastifyRequest; opciones: unknown[] } {
  const opciones: unknown[] = [];
  const archivo = (datos: ParteFalsa) => ({
    type: 'file',
    fieldname: datos.campo ?? 'archivo',
    filename: 'estado.pdf',
    mimetype: 'application/pdf',
    file: { truncated: Boolean(datos.truncada) },
    toBuffer: async () => (datos.falla ? Promise.reject(datos.falla) : Buffer.from('%PDF-1.7')),
  });
  const solicitud = {
    parts: (limites: unknown) => {
      opciones.push(limites);
      const restantes = parte ? [archivo(parte), ...(parte.conOtraParte ? [archivo({})] : [])] : [];
      return { next: async () => (restantes.length ? { done: false, value: restantes.shift() } : { done: true }) };
    },
  } as unknown as FastifyRequest;
  return { solicitud, opciones };
}

describe('leerDocumentoDeSolicitud', () => {
  it('devuelve el contenido y el nombre, con el tope de los documentos', async () => {
    const { solicitud, opciones } = solicitudCon({});

    const documento = await leerDocumentoDeSolicitud(solicitud);

    expect(documento).toEqual({ contenido: Buffer.from('%PDF-1.7'), nombre: 'estado.pdf' });
    expect(opciones[0]).toEqual({
      limits: { files: 1, parts: 1, fields: 0, fieldSize: 0, fileSize: LIMITE_DE_BYTES_DE_FOTO_DE_DOCUMENTO },
    });
  });

  it('un campo con otro nombre se rechaza', async () => {
    const { solicitud } = solicitudCon({ campo: 'otro' });

    await expect(leerDocumentoDeSolicitud(solicitud)).rejects.toBeInstanceOf(SubidaConMasDeUnArchivo);
  });

  it('otra parte después del archivo se rechaza', async () => {
    const { solicitud } = solicitudCon({ conOtraParte: true });

    await expect(leerDocumentoDeSolicitud(solicitud)).rejects.toBeInstanceOf(SubidaConMasDeUnArchivo);
  });

  it.each([
    ['FST_INVALID_MULTIPART_CONTENT_TYPE', 'subida_no_es_de_archivo'],
    ['FST_PROTO_VIOLATION', 'subida_interrumpida'],
  ])('%s sale como un error propio en español', async (code, codigo) => {
    const { solicitud } = solicitudCon({ falla: Object.assign(new Error('en inglés'), { code }) });

    await expect(leerDocumentoDeSolicitud(solicitud)).rejects.toMatchObject({ codigo });
  });

  it('sin archivo dice que falta el documento, no la imagen', async () => {
    const { solicitud } = solicitudCon(null);

    await expect(leerDocumentoDeSolicitud(solicitud)).rejects.toBeInstanceOf(FaltaElDocumento);
  });

  it('una subida cortada por el tope se rechaza como demasiado grande (D4)', async () => {
    const { solicitud } = solicitudCon({ truncada: true });

    await expect(leerDocumentoDeSolicitud(solicitud)).rejects.toBeInstanceOf(SubidaDemasiadoGrande);
  });

  it('el error de archivo demasiado grande del flujo también se rechaza así', async () => {
    const falla = Object.assign(new Error('grande'), { code: 'FST_REQ_FILE_TOO_LARGE' });
    const { solicitud } = solicitudCon({ falla });

    await expect(leerDocumentoDeSolicitud(solicitud)).rejects.toBeInstanceOf(SubidaDemasiadoGrande);
  });

  it('el mensaje del 413 dice los dos límites (S8)', () => {
    expect(new SubidaDemasiadoGrande().message).toBe(
      'El archivo pesa demasiado (máximo 10 MB para PDF y 15 MB para fotos).',
    );
  });

  it.each(['FST_FILES_LIMIT', 'FST_PARTS_LIMIT', 'FST_FIELDS_LIMIT'])(
    '%s pide enviar un solo archivo (S9)',
    async (code) => {
      const { solicitud } = solicitudCon({ falla: Object.assign(new Error('en inglés'), { code }) });

      await expect(leerDocumentoDeSolicitud(solicitud)).rejects.toBeInstanceOf(SubidaConMasDeUnArchivo);
    },
  );

  it('un cierre prematuro de la subida se informa en español (S9)', async () => {
    const falla = Object.assign(new Error('Premature close'), { code: 'ERR_STREAM_PREMATURE_CLOSE' });
    const { solicitud } = solicitudCon({ falla });

    await expect(leerDocumentoDeSolicitud(solicitud)).rejects.toBeInstanceOf(SubidaInterrumpida);
  });
});
