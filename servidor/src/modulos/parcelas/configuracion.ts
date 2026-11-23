import { z } from 'zod';
import { definirConfiguracion, type DefinicionConfiguracion } from '../core/modulos-sistema/definicion-modulo.js';

const factor = z.number().positive();
const entero = z.number().int().positive();

/** Los factores de unidades de superficie: la misma ley para todas las empresas, así que solo soporte los cambia. */
const unidadesDeInstalacion: DefinicionConfiguracion[] = [
  definirConfiguracion({
    clave: 'parcelas.unidades.metros_por_vara',
    descripcion: 'Metros que mide una vara (factor oficial del INE).',
    esquema: factor,
    predeterminado: 0.835905,
    niveles: ['instalacion'],
    publica: true,
  }),
  definirConfiguracion({
    clave: 'parcelas.unidades.varas_cuadradas_por_manzana',
    descripcion: 'Varas cuadradas que tiene una manzana.',
    esquema: factor,
    predeterminado: 10000,
    niveles: ['instalacion'],
    publica: true,
  }),
  definirConfiguracion({
    clave: 'parcelas.unidades.varas_cuadradas_por_caballeria',
    descripcion:
      'Varas cuadradas que tiene una caballería: 645,816, es decir 64.5816 manzanas (tabla del INE), en la misma base que la manzana.',
    esquema: factor,
    predeterminado: 645816,
    niveles: ['instalacion'],
    publica: true,
  }),
];

const unidadesDeLaEmpresa: DefinicionConfiguracion[] = [
  definirConfiguracion({
    clave: 'parcelas.unidades.varas_por_lado_de_cuerda',
    descripcion: 'Varas que mide el lado de una cuerda (25 en la mayor parte del país; en otras regiones es de 40).',
    esquema: z.number().int().min(1).max(100),
    predeterminado: 25,
    niveles: ['empresa', 'instalacion'],
    publica: true,
  }),
  definirConfiguracion({
    clave: 'parcelas.unidades.unidad_para_mostrar',
    descripcion: 'Unidad en que se muestran las superficies de las listas y los reportes.',
    esquema: z.enum(['manzana', 'hectarea', 'cuerda', 'm2']),
    predeterminado: 'manzana',
    niveles: ['empresa', 'instalacion'],
    publica: true,
  }),
  definirConfiguracion({
    clave: 'parcelas.jerarquia.niveles_maximos',
    descripcion: 'Niveles de parcelas bajo una localidad (parcela, subparcela…).',
    esquema: z.number().int().min(1).max(5),
    predeterminado: 3,
    niveles: ['instalacion'],
    publica: false,
  }),
];

const contratos: DefinicionConfiguracion[] = [
  definirConfiguracion({
    clave: 'parcelas.contratos.meses_para_inscribir',
    descripcion:
      'Meses de plazo desde el inicio a partir de los cuales un arrendamiento o una aparcería debe inscribirse en el registro.',
    esquema: entero,
    predeterminado: 36,
    niveles: ['instalacion'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'parcelas.contratos.meses_de_anticipo_para_inscribir',
    descripcion: 'Meses de renta anticipada por encima de los cuales el contrato debe inscribirse.',
    esquema: entero,
    predeterminado: 12,
    niveles: ['instalacion'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'parcelas.contratos.dias_de_aviso_de_renta',
    descripcion: 'Días de anticipación con que una renta se muestra «por vencer».',
    esquema: z.number().int().min(0).max(120),
    predeterminado: 15,
    niveles: ['empresa', 'instalacion'],
    publica: false,
  }),
];

/** Las variables del módulo (`docs/modulos/diseno-parcelas.md` §10.4). */
export const configuracionDeParcelas: DefinicionConfiguracion[] = [
  ...unidadesDeInstalacion,
  ...unidadesDeLaEmpresa,
  ...contratos,
];
