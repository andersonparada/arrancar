import { z } from 'zod';
import type { FormatoDeCheque } from '../../dominio/formatos-de-cheque/tipos.js';

/** Los límites de lo que puede escribir quien arma un formato: todo en milímetros o puntos. */
const medida = (minimo: number, maximo: number) => z.number().min(minimo).max(maximo);
const posicion = medida(0, 400);
const ancho = medida(1, 300);
const letra = medida(6, 16);

const forma = {
  xMm: posicion,
  yMm: posicion,
  anchoMm: ancho,
  tamanoPt: letra.optional(),
  visible: z.boolean(),
};

const alineacion = z.enum(['izquierda', 'centro', 'derecha']);

/** `.strict()` en todo: un campo que no está en la lista (una anotación libre en el cheque) no se acepta. */
const campo = z.strictObject(forma);
const campoAlineable = z.strictObject({ ...forma, alineacion: alineacion.optional() });
const leyenda = z.strictObject({ ...forma, preimpreso: z.boolean() });
const letras = z.strictObject({
  ...forma,
  segundaLinea: z.strictObject({ xMm: posicion, yMm: posicion, anchoMm: ancho }).nullable(),
});

const fecha = z.discriminatedUnion('modo', [
  z.strictObject({ modo: z.literal('texto'), lugarYFecha: campoAlineable }),
  z.strictObject({
    modo: z.literal('casillas'),
    lugar: campo.nullable(),
    dia: campo,
    mes: campo,
    anio: campo,
  }),
]);

/** El formato completo de un cheque: lo que queda de la plantilla de fábrica más los ajustes. */
export const esquemaDeFormatoDeCheque: z.ZodType<FormatoDeCheque> = z.strictObject({
  papel: z.strictObject({ anchoMm: medida(50, 300), altoMm: medida(50, 400) }),
  desplazamiento: z.strictObject({ xMm: medida(-20, 20), yMm: medida(-20, 20) }),
  letra: z.strictObject({ familia: z.literal('monoespaciada'), tamanoPt: letra }),
  fecha,
  beneficiario: campo,
  montoEnNumeros: campo,
  montoEnLetras: letras,
  noNegociable: leyenda,
  paraAbonoEnCuenta: leyenda,
  talonFecha: campoAlineable.nullable(),
  talonBeneficiario: campoAlineable.nullable(),
  talonMonto: campoAlineable.nullable(),
  talonConcepto: campoAlineable.nullable(),
  comprobante: z.strictObject({ yMm: posicion, altoMm: medida(10, 400) }).nullable(),
});
