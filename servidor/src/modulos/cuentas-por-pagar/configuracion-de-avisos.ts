import { z } from 'zod';
import { definirConfiguracion, type DefinicionConfiguracion } from '../core/modulos-sistema/definicion-modulo.js';
import { MARCADORES_DEL_ASUNTO, MARCADORES_DEL_MENSAJE, problemaEnLaPlantilla } from './dominio/aviso-de-pago.js';

/** Las claves de los avisos de pago, para leerlas sin repetir el texto. */
export const CLAVES_DE_AVISOS = {
  envio: 'cuentas-por-pagar.avisos_de_pago.envio',
  asunto: 'cuentas-por-pagar.avisos_de_pago.asunto',
  mensaje: 'cuentas-por-pagar.avisos_de_pago.mensaje',
  adjuntarComprobante: 'cuentas-por-pagar.avisos_de_pago.adjuntar_comprobante',
  copiaALaEmpresa: 'cuentas-por-pagar.avisos_de_pago.copia_a_la_empresa',
} as const;

export const ASUNTO_DEL_AVISO_POR_OMISION = 'Aviso de pago {numero} – {empresa}';

export const MENSAJE_DEL_AVISO_POR_OMISION = `Estimado(a) {proveedor}:

{empresa} le informa que registró el pago {numero} del {fecha} por {monto}, con {forma}, de estos documentos:
{documentos}.

{adjunto}Este correo no es un documento tributario.`;

/** Enlaces, dominios y correos: el aviso va con el remitente de la empresa y no lleva enlaces (C9). */
const ENLACE_O_DOMINIO = /https?:|www\.|@|\b[\w-]+\.(com|net|org|info|gt|io|co|biz|app|me|link)\b/i;

/** Un texto con marcadores: el problema (un marcador que no existe) se ve al guardar, no al enviar. */
function conMarcadores(maximo: number, permitidos: readonly string[]) {
  return z
    .string()
    .trim()
    .min(1)
    .max(maximo)
    .refine((texto) => !ENLACE_O_DOMINIO.test(texto), 'No puede llevar enlaces, dominios ni correos.')
    .superRefine((texto, contexto) => {
      const problema = problemaEnLaPlantilla(texto, permitidos);
      if (problema) contexto.addIssue({ code: 'custom', message: problema });
    });
}

const NIVELES = ['instalacion', 'empresa'] as const;

/** Los esquemas de las variables: la pantalla «Avisos de pago» valida con los mismos que la configuración genérica. */
export const ESQUEMAS_DE_AVISOS = {
  envio: z.enum(['manual', 'automatico']),
  asunto: conMarcadores(150, MARCADORES_DEL_ASUNTO),
  mensaje: conMarcadores(2000, MARCADORES_DEL_MENSAJE),
  adjuntarComprobante: z.boolean(),
  copiaALaEmpresa: z.boolean(),
} as const;

/**
 * Los avisos de pago por correo (solo niveles instalación y empresa). Por omisión el envío es manual: la empresa lo
 * pasa a automático cuando quiere que salga al registrar cada pago.
 */
export const configuracionDeAvisos: readonly DefinicionConfiguracion[] = [
  definirConfiguracion({
    clave: CLAVES_DE_AVISOS.envio,
    descripcion:
      'Cuándo se manda el aviso de pago al proveedor: «manual» (con el botón de la ficha del pago) o «automatico» (al registrar el pago, a los contactos con la marca de avisos).',
    esquema: ESQUEMAS_DE_AVISOS.envio,
    predeterminado: 'manual',
    niveles: [...NIVELES],
    publica: true,
  }),
  definirConfiguracion({
    clave: CLAVES_DE_AVISOS.asunto,
    descripcion: `Asunto del aviso de pago. Marcadores: ${MARCADORES_DEL_ASUNTO.map((m) => `{${m}}`).join(', ')}. No admite el monto ni los documentos.`,
    esquema: ESQUEMAS_DE_AVISOS.asunto,
    predeterminado: ASUNTO_DEL_AVISO_POR_OMISION,
    niveles: [...NIVELES],
    publica: false,
  }),
  definirConfiguracion({
    clave: CLAVES_DE_AVISOS.mensaje,
    descripcion: `Mensaje del aviso de pago, en texto con saltos de línea. Marcadores: ${MARCADORES_DEL_MENSAJE.map((m) => `{${m}}`).join(', ')}.`,
    esquema: ESQUEMAS_DE_AVISOS.mensaje,
    predeterminado: MENSAJE_DEL_AVISO_POR_OMISION,
    niveles: [...NIVELES],
    publica: false,
  }),
  definirConfiguracion({
    clave: CLAVES_DE_AVISOS.adjuntarComprobante,
    descripcion: 'Adjunta al aviso el PDF del comprobante del pago (lleva montos, NIT y retenciones).',
    esquema: ESQUEMAS_DE_AVISOS.adjuntarComprobante,
    predeterminado: true,
    niveles: [...NIVELES],
    publica: false,
  }),
  definirConfiguracion({
    clave: CLAVES_DE_AVISOS.copiaALaEmpresa,
    descripcion: 'Manda copia visible del aviso al correo de la empresa (también es el «Responder a»).',
    esquema: ESQUEMAS_DE_AVISOS.copiaALaEmpresa,
    predeterminado: true,
    niveles: [...NIVELES],
    publica: false,
  }),
];
