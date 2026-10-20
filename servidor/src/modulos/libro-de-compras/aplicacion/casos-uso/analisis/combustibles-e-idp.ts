import type { CombustibleDelMes } from '../../../dominio/analisis/filas-del-analisis.js';
import { galonesATexto } from '../../../dominio/analisis/galones.js';
import { agruparConSubtotal, sumarColumnas } from '../../../dominio/analisis/subtotales.js';
import { dineroEnTexto, quetzales, type ConDineroEnTexto } from '../../dto/analisis.dto.js';
import type { DefinicionDeAnalisis } from './definicion-de-analisis.js';

const DINERO = ['idp', 'base', 'iva', 'exentoYNoAfecto'] as const;
const SUMAS = ['galones', ...DINERO] as const;

type Sumas = Record<(typeof SUMAS)[number], number>;

export interface GrupoDeCombustible {
  combustible: string | null;
  meses: CombustibleDelMes[];
  subtotal: Sumas;
}

export interface CombustiblesEIdp {
  combustibles: GrupoDeCombustible[];
  total: Sumas;
}

type SumasDto = ConDineroEnTexto<Omit<Sumas, 'galones'>, (typeof DINERO)[number]> & { galones: string };

export interface CombustiblesEIdpDto {
  combustibles: Array<{
    combustible: string | null;
    meses: Array<
      SumasDto & {
        periodo: string;
        exentoPorDecreto: boolean;
        /** Avisa que el IDP viene de la factura y no hay galones con qué contrastarlo. */
        aviso: string | null;
      }
    >;
    subtotal: SumasDto;
  }>;
  total: SumasDto;
}

const AVISO_IDP_SIN_GALONES = 'IDP según la factura, sin galones';
const SIN_COMBUSTIBLE = 'Sin combustible (IDP según la factura)';

const sumasDto = (sumas: Sumas): SumasDto => ({
  ...dineroEnTexto(sumas, DINERO),
  galones: galonesATexto(sumas.galones),
});

const avisoDelMes = (mes: CombustibleDelMes): string | null =>
  mes.lineasConIdpSinGalones > 0 ? AVISO_IDP_SIN_GALONES : null;

const filaDeExcel = (nombre: string, periodo: string, sumas: Sumas): unknown[] => [
  nombre,
  periodo,
  Number(galonesATexto(sumas.galones)),
  ...DINERO.map((clave) => quetzales(sumas[clave])),
];

function filasDelGrupo(grupo: GrupoDeCombustible): unknown[][] {
  const nombre = grupo.combustible ?? SIN_COMBUSTIBLE;
  return [
    ...grupo.meses.map((mes) => [
      ...filaDeExcel(nombre, mes.periodo.slice(0, 7), mes),
      mes.exentoPorDecreto ? 'Exento Decreto 22-2026' : '',
      avisoDelMes(mes) ?? '',
    ]),
    [...filaDeExcel(`Subtotal: ${nombre}`, '', grupo.subtotal), '', ''],
  ];
}

/** Combustibles e IDP por combustible y mes, con la marca de los meses con IVA exento (Decreto 22-2026). */
export const combustiblesEIdp: DefinicionDeAnalisis<CombustiblesEIdp, CombustiblesEIdpDto> = {
  clave: 'combustibles',
  async armar({ consultas, empresaId, rango }) {
    const meses = await consultas.combustibles(empresaId, rango);
    const grupos = agruparConSubtotal(meses, { clave: (m) => m.combustible, sumar: SUMAS });
    return {
      combustibles: grupos.map((g) => ({ combustible: g.clave, meses: g.filas, subtotal: g.subtotal })),
      total: sumarColumnas(meses, SUMAS),
    };
  },
  dto: ({ combustibles, total }) => ({
    combustibles: combustibles.map((grupo) => ({
      combustible: grupo.combustible,
      meses: grupo.meses.map((mes) => ({
        periodo: mes.periodo,
        ...sumasDto(mes),
        exentoPorDecreto: mes.exentoPorDecreto,
        aviso: avisoDelMes(mes),
      })),
      subtotal: sumasDto(grupo.subtotal),
    })),
    total: sumasDto(total),
  }),
  hoja: ({ combustibles, total }) => ({
    nombre: 'Combustibles e IDP',
    encabezados: [
      'Combustible',
      'Mes',
      'Galones',
      'IDP',
      'Base',
      'IVA',
      'Exento y no afecto',
      'Decreto 22-2026',
      'Aviso',
    ],
    filas: [...combustibles.flatMap(filasDelGrupo), [...filaDeExcel('Total', '', total), '', '']],
  }),
};
