import { z } from 'zod';
import { definirConfiguracion, type DefinicionConfiguracion } from '../core/modulos-sistema/definicion-modulo.js';
import { claveDelTope, INCISOS_CON_TOPE, type IncisoConTope } from './dominio/incisos-fiscales.js';

const porcentaje = z.number().min(0).max(100).multipleOf(0.01);
const monto = z.number().nonnegative().multipleOf(0.01);

/** Los porcentajes máximos de ley (art. 28 y 33 del ISR): `docs/modulos/diseno-activos-fijos.md` §10.4. */
export const TOPES_POR_OMISION: Readonly<Record<IncisoConTope, number>> = {
  edificios: 5,
  plantaciones: 15,
  instalaciones_y_mobiliario: 20,
  maquinaria_y_vehiculos: 20,
  computo: 33.33,
  herramientas: 25,
  reproductores: 25,
  otros_muebles: 10,
  intangibles: 20,
  llave: 10,
};

/** Tope de ley de un inciso: la ley es igual para todas las empresas, así que solo soporte lo cambia. */
const topeDe = (inciso: IncisoConTope): DefinicionConfiguracion =>
  definirConfiguracion({
    clave: claveDelTope(inciso),
    descripcion: `Porcentaje fiscal máximo de depreciación o amortización por ley para el inciso «${inciso}».`,
    esquema: porcentaje,
    predeterminado: TOPES_POR_OMISION[inciso],
    niveles: ['instalacion'],
    publica: false,
  });

/** Los topes de ley de los incisos que se deprecian, y los ajustes de cada empresa o instalación. */
export const configuracionDeActivosFijos: DefinicionConfiguracion[] = [
  ...INCISOS_CON_TOPE.map(topeDe),
  definirConfiguracion({
    clave: 'activos-fijos.depreciacion.primer_mes',
    descripcion:
      'Desde qué mes se deprecia un bien: el mes en que se pone en uso (el de la baja no se deprecia) o el mes siguiente (el de la baja sí).',
    esquema: z.enum(['mes_de_inicio', 'mes_siguiente']),
    predeterminado: 'mes_de_inicio',
    niveles: ['empresa', 'instalacion'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'activos-fijos.capitalizacion.umbral',
    descripcion:
      'Costo (en quetzales) bajo el cual una línea de la bandeja se propone como gasto o bien de control; 0 es sin umbral. Lo fija la empresa con su contador.',
    esquema: monto,
    predeterminado: 0,
    niveles: ['empresa'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'activos-fijos.codigos.prefijo',
    descripcion: 'Prefijo del código que se propone al dar de alta un activo (el correlativo sigue después).',
    esquema: z.string().trim().max(10),
    predeterminado: 'AF-',
    niveles: ['empresa'],
    publica: true,
  }),
  definirConfiguracion({
    clave: 'activos-fijos.construccion.meses_de_aviso',
    descripcion: 'Meses después de los cuales una obra en construcción sin cerrar aparece como hallazgo del cierre.',
    esquema: z.number().int().positive(),
    predeterminado: 12,
    niveles: ['empresa', 'instalacion'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'activos-fijos.documentos.nombre_de_responsiva',
    descripcion: 'Título de la boleta de traslado, que es también la responsiva de quien recibe los bienes.',
    esquema: z.string().trim().min(1).max(60),
    predeterminado: 'Responsiva de bienes',
    niveles: ['empresa'],
    publica: true,
  }),
];
