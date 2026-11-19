import { z } from 'zod';
import { textoOpcional } from './texto-opcional.js';

const DINERO = /^\d{1,12}(\.\d{1,2})?$/;
const MAXIMO_DE_DOCUMENTOS = 100;
const MAXIMO_DE_VALES_DE_GASTO = 50;

const fecha = z.iso.date({ error: 'Escriba la fecha como AAAA-MM-DD.' });
const texto = (maximo: number, vacio: string) =>
  z.string().trim().min(1, vacio).max(maximo, `Admite hasta ${maximo} caracteres.`);
const monto = z.string().trim().regex(DINERO, 'Escriba el monto con hasta dos decimales.');

/** Entregar un vale: a quién (nombre o usuario), cuánto y para qué. */
export const esquemaEntregarVale = z
  .object({
    fecha: fecha.nullable().optional(),
    monto,
    entregadoA: textoOpcional(150, 'El nombre admite hasta 150 caracteres.'),
    entregadoAUsuarioId: z.uuid().nullable().optional(),
    motivo: texto(300, 'Escriba para qué se entrega el efectivo.'),
  })
  .refine((vale) => Boolean(vale.entregadoA) || Boolean(vale.entregadoAUsuarioId), {
    error: 'Escriba a quién se entrega el efectivo.',
    path: ['entregadoA'],
  });

const documentoPorAsignar = z.object({
  comprobanteId: z.uuid(),
  fecha: fecha.nullable().optional(),
  motivoSobreElTope: textoOpcional(300, 'El motivo admite hasta 300 caracteres.'),
  motivoConRetencion: textoOpcional(300, 'El motivo admite hasta 300 caracteres.'),
});

const valeDeGasto = z.object({
  fecha: fecha.nullable().optional(),
  monto,
  descripcion: texto(300, 'Escriba la descripción del gasto.'),
  pagadoA: texto(150, 'Escriba a quién se pagó.'),
  conceptoDeGastoId: z.uuid({ error: 'Escoja el concepto de gasto.' }),
  motivoSinDocumento: texto(300, 'Escriba por qué no hay factura.'),
  motivoSobreElTope: textoOpcional(300, 'El motivo admite hasta 300 caracteres.'),
});

/** Liquidar: los documentos de la bandeja y los vales de gasto que justifican el vale (puede no haber ninguno). */
export const esquemaLiquidarVale = z.object({
  fecha: fecha.nullable().optional(),
  documentos: z
    .array(documentoPorAsignar)
    .max(MAXIMO_DE_DOCUMENTOS, `Se asignan hasta ${MAXIMO_DE_DOCUMENTOS} documentos a la vez.`)
    .default([])
    .refine((lista) => new Set(lista.map(({ comprobanteId }) => comprobanteId)).size === lista.length, {
      error: 'Un documento no puede repetirse.',
    }),
  valesDeGasto: z
    .array(valeDeGasto)
    .max(MAXIMO_DE_VALES_DE_GASTO, `Se registran hasta ${MAXIMO_DE_VALES_DE_GASTO} vales de gasto a la vez.`)
    .default([]),
});

export const esquemaAnularVale = z.object({ motivo: texto(300, 'Escriba el motivo.') });

export const esquemaParamsDeVale = z.object({ id: z.uuid() });

export type EntregarValeSolicitado = z.infer<typeof esquemaEntregarVale>;
export type LiquidarValeSolicitado = z.output<typeof esquemaLiquidarVale>;
export type AnularValeSolicitado = z.infer<typeof esquemaAnularVale>;
export type ParamsDeVale = z.infer<typeof esquemaParamsDeVale>;
