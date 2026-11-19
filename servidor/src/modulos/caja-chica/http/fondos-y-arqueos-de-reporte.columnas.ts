import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type {
  FilaDeArqueoDto,
  FondoDeArqueosDto,
  ReporteDeArqueosDto,
  ReporteDeEstadoDeFondosDto,
} from '../aplicacion/dto/reportes.dto.js';
import { fechaLegible } from '../dominio/fechas.js';
import { dinero, seccion, texto } from './columnas-de-reporte.js';

/** Una fila del Excel de CC-R4: un fondo al corte, el total o una nota. */
export interface FilaExportadaDeEstadoDeFondos {
  seccion: string;
  fondo: string | null;
  custodio: string | null;
  monto: string | null;
  efectivoEsperado: string | null;
  pendiente: string | null;
  vales: string | null;
  ultimoArqueo: string | null;
  diferencia: string | null;
}

const VACIA_R4: FilaExportadaDeEstadoDeFondos = {
  seccion: '',
  fondo: null,
  custodio: null,
  monto: null,
  efectivoEsperado: null,
  pendiente: null,
  vales: null,
  ultimoArqueo: null,
  diferencia: null,
};

const filaDeFondo = (fondo: ReporteDeEstadoDeFondosDto['fondos'][number]): FilaExportadaDeEstadoDeFondos => ({
  ...VACIA_R4,
  seccion: 'Fondo',
  fondo: fondo.nombre,
  custodio: fondo.custodio,
  monto: fondo.monto,
  efectivoEsperado: fondo.efectivoEsperado,
  pendiente: fondo.pendienteDeReponer,
  vales: fondo.valesAbiertos,
  ultimoArqueo: fondo.ultimoArqueo,
  diferencia: fondo.diferenciaDelArqueo,
});

const filaDeTotal = ({ total }: ReporteDeEstadoDeFondosDto): FilaExportadaDeEstadoDeFondos => ({
  ...VACIA_R4,
  seccion: 'Total',
  monto: total.monto,
  efectivoEsperado: total.efectivoEsperado,
  pendiente: total.pendienteDeReponer,
  vales: total.valesAbiertos,
});

const notaR4 = (mensaje: string): FilaExportadaDeEstadoDeFondos => ({ ...VACIA_R4, seccion: 'Nota', fondo: mensaje });

/** CC-R4 en filas planas. */
export const aFilasExportadasDeEstadoDeFondos = (reporte: ReporteDeEstadoDeFondosDto) => [
  ...reporte.fondos.map(filaDeFondo),
  filaDeTotal(reporte),
  notaR4(`Estado de los fondos al ${fechaLegible(reporte.corte)}.`),
  ...reporte.leyendas.map(notaR4),
];

/** Las columnas del Excel de CC-R4. */
export const columnasDeEstadoDeFondos: Columna[] = [
  seccion,
  texto('fondo', 'Fondo'),
  texto('custodio', 'Custodio'),
  dinero('monto', 'Monto del fondo'),
  dinero('efectivoEsperado', 'Efectivo esperado'),
  dinero('pendiente', 'Pendiente de reponer'),
  dinero('vales', 'Vales abiertos'),
  texto('ultimoArqueo', 'Último arqueo'),
  dinero('diferencia', 'Diferencia del arqueo'),
];

/** Una fila del Excel de CC-R5: un arqueo, el subtotal de un fondo, el total o una nota. */
export interface FilaExportadaDeArqueos {
  seccion: string;
  fondo: string | null;
  arqueo: string | null;
  realizadoEn: string | null;
  custodio: string | null;
  contado: string | null;
  esperado: string | null;
  diferencia: string | null;
  resultado: string | null;
  destino: string | null;
  motivo: string | null;
}

const VACIA_R5: FilaExportadaDeArqueos = {
  seccion: '',
  fondo: null,
  arqueo: null,
  realizadoEn: null,
  custodio: null,
  contado: null,
  esperado: null,
  diferencia: null,
  resultado: null,
  destino: null,
  motivo: null,
};

const TEXTOS_DE_DESTINO = { perdida: 'Pérdida del fondo', cobrar_al_custodio: 'Cobrar al custodio' } as const;

const resumenDe = ({ cantidad, faltantes, sobrantes }: { cantidad: number; faltantes: string; sobrantes: string }) =>
  `${cantidad} arqueos; faltantes ${faltantes}; sobrantes ${sobrantes}`;

const filaDeArqueo = (fondo: string, fila: FilaDeArqueoDto): FilaExportadaDeArqueos => ({
  ...VACIA_R5,
  seccion: 'Arqueo',
  fondo,
  arqueo: `Arqueo ${fila.numero}`,
  realizadoEn: fila.realizadoEn,
  custodio: fila.custodio,
  contado: fila.efectivoContado,
  esperado: fila.efectivoEsperado,
  diferencia: fila.diferencia,
  resultado: fila.resultado,
  destino: fila.destino && TEXTOS_DE_DESTINO[fila.destino],
  motivo: fila.motivo,
});

const notaR5 = (mensaje: string): FilaExportadaDeArqueos => ({ ...VACIA_R5, seccion: 'Nota', fondo: mensaje });

const filasDelFondo = (grupo: FondoDeArqueosDto): FilaExportadaDeArqueos[] => [
  ...grupo.filas.map((fila) => filaDeArqueo(grupo.fondoNombre, fila)),
  { ...VACIA_R5, seccion: 'Subtotal', fondo: grupo.fondoNombre, resultado: resumenDe(grupo) },
];

/** CC-R5 en filas planas: por fondo sus arqueos, y al final el total, el período y las leyendas. */
export const aFilasExportadasDeArqueos = (reporte: ReporteDeArqueosDto): FilaExportadaDeArqueos[] => [
  ...reporte.fondos.flatMap(filasDelFondo),
  { ...VACIA_R5, seccion: 'Total', resultado: resumenDe(reporte.total) },
  notaR5(`Arqueos del ${fechaLegible(reporte.desde)} al ${fechaLegible(reporte.hasta)}.`),
  ...reporte.leyendas.map(notaR5),
];

/** Las columnas del Excel de CC-R5. */
export const columnasDeArqueos: Columna[] = [
  seccion,
  texto('fondo', 'Fondo'),
  texto('arqueo', 'Arqueo'),
  texto('realizadoEn', 'Fecha y hora (UTC)'),
  texto('custodio', 'Custodio'),
  dinero('contado', 'Contado'),
  dinero('esperado', 'Esperado'),
  dinero('diferencia', 'Diferencia'),
  texto('resultado', 'Resultado'),
  texto('destino', 'Destino del faltante'),
  texto('motivo', 'Motivo'),
];
