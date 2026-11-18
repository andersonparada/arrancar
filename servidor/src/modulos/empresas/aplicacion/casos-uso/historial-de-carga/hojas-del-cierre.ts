import type { HojaSimple } from '../../../../core/intercambio/aplicacion/puertos/libro-de-excel.js';
import { fechaParaMostrar } from '../../../dominio/hallazgos-de-la-empresa.js';
import type { DatosDeIdentificacionDto } from '../../dto/datos-de-empresa.dto.js';
import type { CierreDeCargaInicialDto } from '../../dto/historial-de-carga.dto.js';

export interface DatosParaLasHojas {
  empresa: DatosDeIdentificacionDto;
  cierre: CierreDeCargaInicialDto;
  /** La fecha y hora de cierre ya escritas en la zona horaria de la empresa. */
  cerradaEn: string;
}

const ENCABEZADOS_DEL_CIERRE = [
  'Empresa',
  'NIT',
  'Fecha de inicio',
  'Cerrada el',
  'Cerrada por',
  'Diferencias',
  'Avisos',
  'Motivo',
  'Balance de apertura',
  'Páginas del balance',
  'Huella del balance (sha256)',
  'Huella de la revisión',
];

function datosDelBalance({ balanceDeApertura }: CierreDeCargaInicialDto): unknown[] {
  return [balanceDeApertura?.nombreOriginal ?? '', balanceDeApertura?.paginas ?? '', balanceDeApertura?.sha256 ?? ''];
}

function hojaDelCierre({ empresa, cierre, cerradaEn }: DatosParaLasHojas): HojaSimple {
  return {
    nombre: 'Cierre',
    encabezados: ENCABEZADOS_DEL_CIERRE,
    filas: [
      [
        empresa.nombre,
        empresa.nit ?? '',
        fechaParaMostrar(cierre.fechaDeInicio),
        cerradaEn,
        cierre.cerradaPor ?? '',
        cierre.diferencias,
        cierre.avisos,
        cierre.motivo ?? '',
        ...datosDelBalance(cierre),
        cierre.huella,
      ],
    ],
  };
}

const NIVELES = { pide_motivo: 'Pide motivo', aviso: 'Aviso' } as const;

function hojaDeLosHallazgos({ cierre }: DatosParaLasHojas): HojaSimple {
  return {
    nombre: 'Hallazgos',
    encabezados: ['Módulo', 'Nivel', 'Registro', 'Mensaje'],
    filas: cierre.modulos.flatMap((modulo) =>
      modulo.hallazgos.map((hallazgo) => [
        modulo.nombreDelModulo,
        NIVELES[hallazgo.nivel],
        hallazgo.registro?.nombre ?? '',
        hallazgo.mensaje,
      ]),
    ),
  };
}

function hojaDeLasCifras({ cierre }: DatosParaLasHojas): HojaSimple {
  return {
    nombre: 'Cifras',
    encabezados: ['Módulo', 'Registro', 'Concepto', 'Valor'],
    // Los montos y las cantidades van como número de Excel, no como texto.
    filas: cierre.modulos.flatMap((modulo) =>
      modulo.cifras.map((cifra) => [
        modulo.nombreDelModulo,
        cifra.registro?.nombre ?? '',
        cifra.etiqueta,
        Number(cifra.valor),
      ]),
    ),
  };
}

/** Las tres hojas del Excel de un cierre guardado: Cierre, Hallazgos y Cifras. */
export function hojasDelCierre(datos: DatosParaLasHojas): HojaSimple[] {
  return [hojaDelCierre(datos), hojaDeLosHallazgos(datos), hojaDeLasCifras(datos)];
}
