import type { ClaveDeRubro } from './rubros-del-sat-2237.js';

export const CLAVES_DE_CASILLA = [
  'combustibles',
  'bienes',
  'servicios',
  'activos_fijos',
  'importaciones_centro_america',
  'importaciones_fyduca',
  'importaciones_resto_del_mundo',
  'activos_fijos_importados',
  'pequenos_contribuyentes',
  'sin_derecho_a_compensacion',
  'remanente',
] as const;
export type ClaveDeCasilla = (typeof CLAVES_DE_CASILLA)[number];

/** Una casilla de la sección 5 (crédito fiscal por operaciones locales e importaciones). Sin número: aún no hay captura. */
export interface DefinicionDeCasilla {
  clave: ClaveDeCasilla;
  nombre: string;
  /** El IVA de la casilla es crédito fiscal; si no, es el que fue al costo o la casilla solo lleva base. */
  ivaDeCredito: boolean;
  /** La casilla no se llena desde Arrancar: la prellena la SAT. */
  llenaLaSat: boolean;
}

/** A qué casilla va un rubro; `parte` escoge una porción del rubro cuando este se reparte en varias casillas. */
export interface ReparticionDeRubro {
  casilla: ClaveDeCasilla;
  parte?: string;
}

export interface MapaDeCasillas {
  /** De dónde se tomaron los nombres. */
  version: string;
  /** `false` mientras los nombres vengan de las guías y no de una captura del formulario vigente. */
  confirmado: boolean;
  seccion5: { nombre: string; casillas: DefinicionDeCasilla[] };
  seccion6: { nombre: string; maximoDeProveedores: number };
  seccion9: { nombre: string; cantidad: string; monto: string };
  /** Varios rubros pueden sumar en una casilla y un rubro puede repartirse en varias. */
  reparto: Record<ClaveDeRubro, ReparticionDeRubro[]>;
}

const credito = (clave: ClaveDeCasilla, nombre: string): DefinicionDeCasilla => ({
  clave,
  nombre,
  ivaDeCredito: true,
  llenaLaSat: false,
});

const sinCredito = (clave: ClaveDeCasilla, nombre: string): DefinicionDeCasilla => ({
  clave,
  nombre,
  ivaDeCredito: false,
  llenaLaSat: false,
});

const alIgualQueElRubro = (casilla: ClaveDeCasilla): ReparticionDeRubro[] => [{ casilla }];

/**
 * Nombres de las guías de Declaraguate, **sin confirmar** (versión hasta 2026-08): desde el 1-sep-2026 el formulario se
 * presenta en la Agencia Virtual. Cuando haya una captura de allí se ajustan los nombres, se agregan los números y se
 * pone `confirmado` en `true`.
 */
export const MAPA_DE_CASILLAS_SAT_2237: MapaDeCasillas = {
  version: 'Declaraguate (hasta 2026-08)',
  confirmado: false,
  seccion5: {
    nombre: 'Crédito fiscal por operaciones locales e importaciones',
    casillas: [
      credito('combustibles', 'Combustibles'),
      credito('bienes', 'Compras de bienes (sin medicamentos ni vehículos)'),
      credito('servicios', 'Servicios'),
      credito('activos_fijos', 'Activos fijos directamente vinculados'),
      credito('importaciones_centro_america', 'Importaciones de Centro América'),
      credito('importaciones_fyduca', 'Importaciones con FYDUCA'),
      credito('importaciones_resto_del_mundo', 'Importaciones del resto del mundo'),
      credito('activos_fijos_importados', 'Activos fijos importados'),
      sinCredito('pequenos_contribuyentes', 'Compras a pequeños contribuyentes'),
      sinCredito('sin_derecho_a_compensacion', 'Compras que no generan derecho a compensación del crédito fiscal'),
      { ...credito('remanente', 'Remanente del crédito fiscal'), llenaLaSat: true },
    ],
  },
  seccion6: { nombre: 'Principales proveedores', maximoDeProveedores: 10 },
  seccion9: { nombre: 'Operaciones del período', cantidad: 'Cantidad de operaciones', monto: 'Monto de operaciones' },
  reparto: {
    combustibles: alIgualQueElRubro('combustibles'),
    activos_fijos: alIgualQueElRubro('activos_fijos'),
    servicios: alIgualQueElRubro('servicios'),
    otras_compras: alIgualQueElRubro('bienes'),
    importaciones: [
      { casilla: 'importaciones_centro_america', parte: 'centro_america' },
      { casilla: 'importaciones_fyduca', parte: 'fyduca' },
      { casilla: 'importaciones_resto_del_mundo', parte: 'resto_del_mundo' },
      { casilla: 'activos_fijos_importados', parte: 'activos_fijos' },
    ],
    pequeno_contribuyente: alIgualQueElRubro('pequenos_contribuyentes'),
    regimenes_sin_iva: alIgualQueElRubro('sin_derecho_a_compensacion'),
    compras_sin_credito: alIgualQueElRubro('sin_derecho_a_compensacion'),
    exento_y_no_afecto: alIgualQueElRubro('sin_derecho_a_compensacion'),
    /** Informativo: ya está dentro de «Exento y no afecto» (su casilla propia sigue abierta, pregunta L5-C5). */
    combustibles_exentos: [],
  },
};
