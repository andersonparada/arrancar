import { z } from 'zod';
import { definirConfiguracion, type DefinicionConfiguracion } from '../core/modulos-sistema/definicion-modulo.js';
import { MESES_MAXIMOS_POR_OMISION, MESES_POR_OMISION } from './dominio/plazo-por-omision.js';

/** Variables de Cuentas por pagar: solo en los niveles instalación y empresa. */
export const configuracionDeCuentasPorPagar: readonly DefinicionConfiguracion[] = [
  definirConfiguracion({
    clave: 'cuentas-por-pagar.vencimientos.meses_por_omision',
    descripcion:
      'Meses de crédito que se proponen al recibir un documento de un proveedor sin días de crédito propios (0 es contado).',
    esquema: z.number().int().min(0).max(MESES_MAXIMOS_POR_OMISION),
    predeterminado: MESES_POR_OMISION,
    niveles: ['instalacion', 'empresa'],
    publica: false,
  }),
];
