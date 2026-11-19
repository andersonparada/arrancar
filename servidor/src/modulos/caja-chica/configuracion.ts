import { z } from 'zod';
import { definirConfiguracion, type DefinicionConfiguracion } from '../core/modulos-sistema/definicion-modulo.js';

/** Variables de Caja chica: solo en los niveles instalación y empresa (diseño §9.5). */
export const configuracionDeCajaChica: readonly DefinicionConfiguracion[] = [
  definirConfiguracion({
    clave: 'caja-chica.comprobantes.tope_por_omision',
    descripcion:
      'Tope por comprobante (en quetzales) para los fondos que no tienen el suyo: pasarse exige el permiso de excepción y un motivo. Con 0 no hay tope.',
    esquema: z.number().nonnegative().multipleOf(0.01),
    predeterminado: 2000,
    niveles: ['instalacion', 'empresa'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'caja-chica.vales_de_gasto.permitidos',
    descripcion: 'Si se pueden registrar vales de gasto (gastos menores sin factura) en los fondos.',
    esquema: z.boolean(),
    predeterminado: true,
    niveles: ['instalacion', 'empresa'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'caja-chica.vales_de_gasto.tope',
    descripcion:
      'Monto máximo (en quetzales) de un vale de gasto: pasarse exige el permiso de excepción y un motivo. Con 0 no hay tope.',
    esquema: z.number().nonnegative().multipleOf(0.01),
    predeterminado: 200,
    niveles: ['instalacion', 'empresa'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'caja-chica.control.separacion_de_funciones',
    descripcion:
      'Qué hacer cuando el custodio de un fondo es quien lo repone o lo arquea: avisar (queda registrado) o bloquear.',
    esquema: z.enum(['avisar', 'bloquear']),
    predeterminado: 'avisar',
    niveles: ['instalacion', 'empresa'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'caja-chica.arqueos.dias_para_avisar',
    descripcion:
      'Días sin arquear un fondo para que el sistema lo avise (el arqueo es opcional). Con 0 no se avisa nunca.',
    esquema: z.number().int().min(0).max(365),
    predeterminado: 30,
    niveles: ['instalacion', 'empresa'],
    publica: false,
  }),
];
