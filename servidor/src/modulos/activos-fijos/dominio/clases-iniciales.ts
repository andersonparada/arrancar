import type { IncisoFiscal } from './incisos-fiscales.js';

/** Una clase sugerida: nombre, inciso y porcentaje fiscal; sin vida útil propia ni valor residual. */
export interface ClaseSugerida {
  nombre: string;
  incisoFiscal: IncisoFiscal;
  porcentajeFiscal: string;
}

/**
 * La lista sugerida de clases (`docs/modulos/diseno-activos-fijos.md` §5.1), con los porcentajes del art. 28 del ISR.
 * Un punto de partida general: cada empresa la edita, inactiva o amplía. Se siembra al abrir el catálogo vacío.
 */
export const CLASES_SUGERIDAS: readonly ClaseSugerida[] = [
  { nombre: 'Edificios', incisoFiscal: 'edificios', porcentajeFiscal: '5.00' },
  { nombre: 'Plantaciones productivas', incisoFiscal: 'plantaciones', porcentajeFiscal: '15.00' },
  { nombre: 'Instalaciones y mobiliario', incisoFiscal: 'instalaciones_y_mobiliario', porcentajeFiscal: '20.00' },
  { nombre: 'Maquinaria y equipo', incisoFiscal: 'maquinaria_y_vehiculos', porcentajeFiscal: '20.00' },
  { nombre: 'Vehículos', incisoFiscal: 'maquinaria_y_vehiculos', porcentajeFiscal: '20.00' },
  { nombre: 'Semovientes de trabajo', incisoFiscal: 'maquinaria_y_vehiculos', porcentajeFiscal: '20.00' },
  { nombre: 'Equipo de cómputo', incisoFiscal: 'computo', porcentajeFiscal: '33.33' },
  { nombre: 'Herramientas', incisoFiscal: 'herramientas', porcentajeFiscal: '25.00' },
  { nombre: 'Reproductores', incisoFiscal: 'reproductores', porcentajeFiscal: '25.00' },
  { nombre: 'Otros bienes muebles', incisoFiscal: 'otros_muebles', porcentajeFiscal: '10.00' },
  { nombre: 'Programas y licencias', incisoFiscal: 'intangibles', porcentajeFiscal: '20.00' },
  { nombre: 'Otros intangibles', incisoFiscal: 'intangibles', porcentajeFiscal: '20.00' },
  { nombre: 'Derecho de llave', incisoFiscal: 'llave', porcentajeFiscal: '10.00' },
  { nombre: 'Terrenos', incisoFiscal: 'terrenos', porcentajeFiscal: '0.00' },
];

/** La ayuda que acompaña a «Programas y licencias» (dictamen V-2): la bandeja y la pantalla la muestran. */
export const AYUDA_DE_PROGRAMAS_Y_LICENCIAS =
  'Solo licencias compradas aparte. El programa incluido en el equipo es parte del equipo; las suscripciones son gasto.';
