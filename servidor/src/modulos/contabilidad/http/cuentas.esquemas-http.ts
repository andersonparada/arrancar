import { z } from 'zod';
import { opcionObligatoria, opcionOpcional, textoObligatorio } from '../../core/compartido/http/esquemas-comunes.js';
import {
  CLASES_DE_FLUJO,
  NATURALEZAS,
  TIPOS_DE_CUENTA,
  TRATAMIENTOS_FISCALES,
} from '../dominio/clasificaciones-de-cuenta.js';
import { RUBROS } from '../dominio/rubros.js';

/**
 * Forma de lo que llega al registrar o cambiar una cuenta; las reglas de negocio las revisa el dominio. La cuenta
 * superior y el nivel salen del código, así que no se piden.
 */
export const esquemaCuenta = z.object({
  codigo: textoObligatorio(40),
  nombre: textoObligatorio(150),
  esDeDetalle: z.boolean().default(false),
  naturaleza: opcionObligatoria(NATURALEZAS),
  tipo: opcionObligatoria(TIPOS_DE_CUENTA),
  rubro: opcionOpcional(RUBROS),
  corriente: z.boolean().default(false),
  claseDeFlujo: opcionOpcional(CLASES_DE_FLUJO),
  esMonetaria: z.boolean().default(false),
  pideTercero: z.boolean().default(false),
  pideCentroDeCosto: z.boolean().default(false),
  esDeControl: z.boolean().default(false),
  tratamientoFiscal: opcionObligatoria(TRATAMIENTOS_FISCALES).default('no_aplica'),
  activo: z.boolean().default(true),
});

export const esquemaParamsCuenta = z.object({ cuentaId: z.uuid() });

export type CuentaSolicitado = z.infer<typeof esquemaCuenta>;
export type ParamsCuenta = z.infer<typeof esquemaParamsCuenta>;
