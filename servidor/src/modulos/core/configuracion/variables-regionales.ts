import { z } from 'zod';
import { definirConfiguracion } from '../modulos-sistema/definicion-modulo.js';

const EN_TODOS_LOS_NIVELES = ['instalacion', 'cuenta', 'empresa'] as const;

const decimales = z.number().int().min(0).max(4);

/** Cómo se muestran fechas y números; el navegador las recibe con la sesión. */
export const variablesRegionales = [
  definirConfiguracion({
    clave: 'core.regional.zona_horaria',
    descripcion: 'Zona horaria para fechas y recordatorios.',
    esquema: z
      .string()
      .refine((zona) => Intl.supportedValuesOf('timeZone').includes(zona), 'Zona horaria desconocida.'),
    predeterminado: 'America/Guatemala',
    niveles: EN_TODOS_LOS_NIVELES,
    publica: true,
  }),
  definirConfiguracion({
    clave: 'core.regional.formato_fecha',
    descripcion: 'Cómo se escriben las fechas en pantalla.',
    esquema: z.enum(['dd/mm/aaaa', 'aaaa-mm-dd', 'mm/dd/aaaa']),
    predeterminado: 'dd/mm/aaaa',
    niveles: EN_TODOS_LOS_NIVELES,
    publica: true,
  }),
  definirConfiguracion({
    clave: 'core.regional.decimales_montos',
    descripcion: 'Decimales con que se muestran los montos de dinero (0 a 4).',
    esquema: decimales,
    predeterminado: 2,
    niveles: EN_TODOS_LOS_NIVELES,
    publica: true,
  }),
  definirConfiguracion({
    clave: 'core.regional.decimales_cantidades',
    descripcion: 'Decimales con que se muestran las cantidades: quintales, litros, kilos (0 a 4).',
    esquema: decimales,
    predeterminado: 2,
    niveles: EN_TODOS_LOS_NIVELES,
    publica: true,
  }),
];
