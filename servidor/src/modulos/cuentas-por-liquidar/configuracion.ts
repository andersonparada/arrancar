import { z } from 'zod';
import { definirConfiguracion, type DefinicionConfiguracion } from '../core/modulos-sistema/definicion-modulo.js';

/** Los días para liquidar que se proponen mientras la empresa no ponga los suyos (la ley no fija plazo, L8). */
export const DIAS_PARA_LIQUIDAR_POR_OMISION = 15;

/** Variables de Cuentas por liquidar: solo en los niveles instalación y empresa. */
export const configuracionDeCuentasPorLiquidar: readonly DefinicionConfiguracion[] = [
  definirConfiguracion({
    clave: 'cuentas-por-liquidar.anticipos.dias_para_liquidar',
    descripcion:
      'Días que se dan para liquidar un anticipo: la fecha límite que se propone es la de la entrega más estos días.',
    esquema: z.number().int().min(1).max(365),
    predeterminado: DIAS_PARA_LIQUIDAR_POR_OMISION,
    niveles: ['instalacion', 'empresa'],
    publica: true,
  }),
  definirConfiguracion({
    clave: 'cuentas-por-liquidar.anticipos.bloquear_con_vencidos',
    descripcion:
      'Si está encendida, no se entrega un anticipo a quien tiene anticipos vencidos sin liquidar, salvo con el permiso de excepción y un motivo. Apagada, solo se avisa.',
    esquema: z.boolean(),
    predeterminado: false,
    niveles: ['instalacion', 'empresa'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'cuentas-por-liquidar.gastos_sin_documento.permitidos',
    descripcion:
      'Si está encendida, se pueden registrar en un anticipo gastos sin documento (con concepto y motivo); apagada, todo gasto exige su documento del libro de compras.',
    esquema: z.boolean(),
    predeterminado: true,
    niveles: ['instalacion', 'empresa'],
    publica: true,
  }),
];
