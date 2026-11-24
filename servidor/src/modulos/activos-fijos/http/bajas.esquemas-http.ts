import { z } from 'zod';
import {
  decimalObligatorio,
  enteroObligatorio,
  fechaObligatoria,
  idObligatorio,
  idOpcional,
  opcionObligatoria,
  textoObligatorio,
  textoOpcional,
} from '../../core/compartido/http/esquemas-comunes.js';
import { CAUSAS_DE_BAJA, TIPOS_DE_ACTA } from '../dominio/tipos-de-baja.js';

const esquemaVenta = z.object({
  comprador: textoObligatorio(150),
  nitDelComprador: textoObligatorio(20),
  precio: decimalObligatorio(2),
  iva: decimalObligatorio(2),
  serieFel: textoOpcional(60),
  numeroFel: textoObligatorio(60),
  autorizacionFel: z.uuid('La autorización de la factura debe ser un identificador válido.'),
});

/** Forma de lo que llega al dar de baja o vender; las reglas de negocio las revisan el dominio y el caso de uso. */
export const esquemaBaja = z.object({
  activoId: idObligatorio(),
  cantidad: enteroObligatorio().min(1).optional(),
  fecha: fechaObligatoria(),
  causa: opcionObligatoria(CAUSAS_DE_BAJA),
  descripcion: textoObligatorio(500),
  autorizadaPor: textoObligatorio(150),
  destinoDelBien: textoOpcional(300),
  numeroDeDenuncia: textoOpcional(60),
  inventarioId: idOpcional(),
  tercerosConfirmados: z.array(textoObligatorio(30)).max(100).optional(),
  venta: esquemaVenta.nullish().transform((venta) => venta ?? null),
});

export const esquemaAnulacionDeBaja = z.object({ motivo: textoObligatorio(300) });

export const esquemaParamsBaja = z.object({ id: z.uuid() });

/** El acta lleva su tipo (V-12) en la dirección: el cuerpo es solo el archivo. */
export const esquemaConsultaDeActa = z.object({ tipoDeActa: opcionObligatoria(TIPOS_DE_ACTA) });

export type BajaSolicitada = z.infer<typeof esquemaBaja>;
export type AnulacionDeBajaSolicitada = z.infer<typeof esquemaAnulacionDeBaja>;
export type ParamsBaja = z.infer<typeof esquemaParamsBaja>;
export type ConsultaDeActa = z.infer<typeof esquemaConsultaDeActa>;
