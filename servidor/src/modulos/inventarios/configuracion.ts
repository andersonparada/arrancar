import { z } from 'zod';
import { definirConfiguracion, type DefinicionConfiguracion } from '../core/modulos-sistema/definicion-modulo.js';

/**
 * Los ajustes de Inventarios (`docs/modulos/diseno-inventarios.md` §10.4); solo en los niveles empresa e
 * instalación. Algunos los usan pasos que vienen después (INV-4 en adelante); aquí solo se declaran.
 */
export const configuracionDeInventarios: DefinicionConfiguracion[] = [
  definirConfiguracion({
    clave: 'inventarios.costeo.metodo_inicial',
    descripcion:
      'El método de costeo que se propone y que se fija con el primer movimiento si nadie lo eligió: promedio ponderado o PEPS.',
    esquema: z.enum(['promedio_ponderado', 'peps']),
    predeterminado: 'promedio_ponderado',
    niveles: ['empresa', 'instalacion'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'inventarios.traslados.con_transito',
    descripcion: 'Si un traslado entre bodegas pasa por «en tránsito» hasta que la bodega de destino lo recibe.',
    esquema: z.boolean(),
    predeterminado: false,
    niveles: ['empresa'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'inventarios.ajustes.requiere_aprobacion',
    descripcion:
      'Si un ajuste de faltante o sobrante necesita que otra persona lo apruebe antes de mover el inventario.',
    esquema: z.boolean(),
    predeterminado: true,
    niveles: ['empresa'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'inventarios.ajustes.aprobar_lo_propio',
    descripcion: 'Si quien registra un ajuste puede aprobarlo él mismo (sin segregación de funciones).',
    esquema: z.boolean(),
    predeterminado: false,
    niveles: ['empresa'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'inventarios.ajustes.destino_del_sobrante',
    descripcion:
      'A dónde se lleva el valor de un sobrante: otros ingresos o menor costo de ventas (solo viaja en el evento).',
    esquema: z.enum(['otros_ingresos', 'menor_costo_de_ventas']),
    predeterminado: 'otros_ingresos',
    niveles: ['empresa'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'inventarios.conteos.bloquear_bodega',
    descripcion: 'Si una bodega no recibe ni entrega mercadería mientras se cuenta.',
    esquema: z.boolean(),
    predeterminado: true,
    niveles: ['empresa'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'inventarios.vencimientos.dias_de_aviso',
    descripcion: 'Días antes del vencimiento en que un lote aparece como «por vencer».',
    esquema: z.number().int().positive(),
    predeterminado: 30,
    niveles: ['empresa', 'instalacion'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'inventarios.codigos.prefijo',
    descripcion: 'Prefijo del código que se propone al registrar un artículo (el correlativo sigue después).',
    esquema: z.string().trim().max(10),
    predeterminado: 'ART-',
    niveles: ['empresa'],
    publica: true,
  }),
];
