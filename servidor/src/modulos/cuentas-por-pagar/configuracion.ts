import { z } from 'zod';
import { definirConfiguracion, type DefinicionConfiguracion } from '../core/modulos-sistema/definicion-modulo.js';
import { MESES_MAXIMOS_POR_OMISION, MESES_POR_OMISION } from './dominio/plazo-por-omision.js';

/** La leyenda al pie de la contraseña impresa mientras la empresa no ponga la suya (dictamen C-CP3-1). */
export const LEYENDA_DE_CONTRASENAS_POR_OMISION =
  'Documentos recibidos para revisión. Esta contraseña no implica aceptación de las facturas; el pago está sujeto a su autorización. Presente esta contraseña para cobrar.';

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
  definirConfiguracion({
    clave: 'cuentas-por-pagar.bancarizacion.umbral',
    descripcion:
      'Total (en quetzales) desde el cual compensar un cargo con una nota de crédito pide guardar por escrito el acuerdo con el proveedor (bancarización, Decreto 20-2006).',
    esquema: z.number().positive().multipleOf(0.01),
    predeterminado: 30000,
    niveles: ['instalacion'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'cuentas-por-pagar.ajustes.tope_diferencia_menor',
    descripcion:
      'Monto máximo (en quetzales) de un ajuste con causa «Diferencia menor» al dar de baja el saldo a favor de una nota de crédito. Con 0 esa causa no se puede usar.',
    esquema: z.number().nonnegative().multipleOf(0.01),
    predeterminado: 25,
    niveles: ['instalacion', 'empresa'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'cuentas-por-pagar.pagos.tope_diferencia',
    descripcion:
      'Monto máximo (en quetzales) de la diferencia de centavos que se da por saldada de un documento al pagarlo (solo redondeos: un descuento exige nota de crédito). Con 0 no se puede saldar ninguna.',
    esquema: z.number().nonnegative().multipleOf(0.01),
    predeterminado: 1,
    niveles: ['instalacion', 'empresa'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'cuentas-por-pagar.contrasenas.leyenda',
    descripcion:
      'Texto al pie de la contraseña de pago impresa. Cada empresa puede reemplazarlo (por ejemplo, con el horario de pagos); vacío, no se imprime.',
    esquema: z.string().max(500),
    predeterminado: LEYENDA_DE_CONTRASENAS_POR_OMISION,
    niveles: ['instalacion', 'empresa'],
    publica: false,
  }),
];
