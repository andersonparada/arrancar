import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type {
  ActividadDelFlujo,
  ActividadDelFlujoDto,
  LineaDeFlujoDto,
  ReporteDeFlujoDeEfectivoDto,
} from '../aplicacion/dto/reportes-por-concepto.dto.js';

/** Una fila del Excel del flujo: una línea, el total de una actividad o una cifra del control de cuadre. */
export interface FilaExportadaDelFlujo {
  seccion: string;
  linea: string;
  entradas: string | null;
  salidas: string | null;
  neto: string;
}

const TITULO_DE_LA_ACTIVIDAD: Record<ActividadDelFlujo, string> = {
  operacion: 'Actividades de operación',
  inversion: 'Actividades de inversión',
  financiamiento: 'Actividades de financiamiento',
};

const SECCION_APARTE = 'Otras líneas';
const SECCION_DEL_CONTROL = 'Control de cuadre';

const deLinea = (seccion: string, { etiqueta, entradas, salidas, neto }: LineaDeFlujoDto): FilaExportadaDelFlujo => ({
  seccion,
  linea: etiqueta,
  entradas,
  salidas,
  neto,
});

function filasDeLaActividad(actividad: ActividadDelFlujoDto): FilaExportadaDelFlujo[] {
  const titulo = TITULO_DE_LA_ACTIVIDAD[actividad.actividad];
  const total = { ...actividad, etiqueta: `Total ${titulo.toLowerCase()}`, cantidad: 0 };
  return [...actividad.lineas.map((linea) => deLinea(titulo, linea)), deLinea(titulo, total)];
}

const cifraDelControl = (linea: string, neto: string): FilaExportadaDelFlujo => ({
  seccion: SECCION_DEL_CONTROL,
  linea,
  entradas: null,
  salidas: null,
  neto,
});

function filasDelControl({ control }: ReporteDeFlujoDeEfectivoDto): FilaExportadaDelFlujo[] {
  return [
    cifraDelControl('Saldo al inicio del rango', control.saldoAlInicio),
    cifraDelControl('Saldos iniciales de cuentas en el rango', control.saldosInicialesDelRango),
    cifraDelControl('Flujo neto del período', control.flujoNeto),
    cifraDelControl('Saldo calculado', control.saldoCalculado),
    cifraDelControl('Saldo al final en libros', control.saldoAlFinal),
    cifraDelControl(control.cuadra ? 'Diferencia (cuadra)' : 'Diferencia (NO CUADRA)', control.diferencia),
  ];
}

/** El reporte en filas planas para Excel: actividades con su total, las líneas aparte y el control de cuadre. */
export const aFilasExportadasDelFlujo = (reporte: ReporteDeFlujoDeEfectivoDto): FilaExportadaDelFlujo[] => [
  ...reporte.actividades.flatMap(filasDeLaActividad),
  ...reporte.lineasAparte.map((linea) => deLinea(SECCION_APARTE, linea)),
  ...filasDelControl(reporte),
];

/** Las columnas del Excel del flujo de efectivo: solo se exporta, nunca se importa. */
export const columnasDelFlujoDeEfectivo: Columna[] = [
  { clave: 'seccion', titulo: 'Sección', requerido: true, tipo: 'texto' },
  { clave: 'linea', titulo: 'Línea', requerido: true, tipo: 'texto' },
  { clave: 'entradas', titulo: 'Entradas', requerido: false, tipo: 'decimal' },
  { clave: 'salidas', titulo: 'Salidas', requerido: false, tipo: 'decimal' },
  { clave: 'neto', titulo: 'Neto', requerido: true, tipo: 'decimal' },
];
