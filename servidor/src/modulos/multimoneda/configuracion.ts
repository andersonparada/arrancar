import { z } from 'zod';
import { definirConfiguracion, type DefinicionConfiguracion } from '../core/modulos-sistema/definicion-modulo.js';

/** Los ajustes de Multimoneda; las cifras de la carga de tipos de cambio (7 días, 3 %, horario) son constantes del dominio. */
export const configuracionDeMultimoneda: DefinicionConfiguracion[] = [
  definirConfiguracion({
    clave: 'multimoneda.diferencial.metodo',
    descripcion:
      'Cómo se calcula el diferencial cambiario de un pago: acumulativo (contra la base de la deuda) o por reversión (contra el tipo del último cierre).',
    esquema: z.enum(['acumulativo', 'reversion']),
    predeterminado: 'acumulativo',
    niveles: ['instalacion', 'empresa'],
    publica: true,
  }),
];
