import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type { CorrelativoDto, ReporteDeCorrelativosDto } from '../aplicacion/dto/correlativo.dto.js';

/** Una fila del Excel de correlativos: un hueco con una de sus explicaciones (o sin ninguna, si es alerta). */
export interface FilaExportadaDeCorrelativo {
  nombre: string;
  anio: number | null;
  ultimo: number;
  emitidos: number;
  numero: number;
  estado: string;
  accion: string | null;
  usuarioNombre: string | null;
  fecha: string | null;
  motivo: string | null;
}

const TEXTO_DEL_ESTADO = { explicado: 'Explicado', alerta: 'Alerta: sin auditoría' } as const;
const TEXTO_DE_LA_ACCION = { eliminar: 'Eliminó', corregir: 'Cambió de tipo' } as const;

function filasDelCorrelativo(correlativo: CorrelativoDto): FilaExportadaDeCorrelativo[] {
  const { nombre, anio, ultimo, emitidos } = correlativo;
  const base = { nombre, anio: anio > 0 ? anio : null, ultimo, emitidos };
  return correlativo.huecos.flatMap(({ numero, estado, explicaciones }) => {
    const filaSinExplicar = { accion: null, usuarioNombre: null, fecha: null, motivo: null };
    const explicadas = explicaciones.map((e) => ({
      accion: TEXTO_DE_LA_ACCION[e.accion],
      usuarioNombre: e.usuarioNombre,
      fecha: e.fecha.slice(0, 10),
      motivo: e.motivo,
    }));
    return (explicadas.length > 0 ? explicadas : [filaSinExplicar]).map((explicacion) => ({
      ...base,
      numero,
      estado: TEXTO_DEL_ESTADO[estado],
      ...explicacion,
    }));
  });
}

/** El reporte de correlativos en filas planas para Excel: una por hueco y explicación. */
export const aFilasExportadasDeCorrelativos = ({ correlativos }: ReporteDeCorrelativosDto) =>
  correlativos.flatMap(filasDelCorrelativo);

/** Las columnas del Excel del reporte de correlativos: solo se exporta, nunca se importa. */
export const columnasDelReporteDeCorrelativos: Columna[] = [
  { clave: 'nombre', titulo: 'Correlativo', requerido: true, tipo: 'texto' },
  { clave: 'anio', titulo: 'Año', requerido: false, tipo: 'entero' },
  { clave: 'ultimo', titulo: 'Último número', requerido: true, tipo: 'entero' },
  { clave: 'emitidos', titulo: 'Emitidos', requerido: true, tipo: 'entero' },
  { clave: 'numero', titulo: 'Número faltante', requerido: true, tipo: 'entero' },
  { clave: 'estado', titulo: 'Estado', requerido: true, tipo: 'texto' },
  { clave: 'accion', titulo: 'Acción', requerido: false, tipo: 'texto' },
  { clave: 'usuarioNombre', titulo: 'Usuario', requerido: false, tipo: 'texto' },
  { clave: 'fecha', titulo: 'Fecha', requerido: false, tipo: 'fecha' },
  { clave: 'motivo', titulo: 'Motivo', requerido: false, tipo: 'texto' },
];
