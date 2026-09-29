import type { ClaveDeCorrelativo, Correlativo, ExplicacionDeHueco } from '../../servicios/correlativos.api';

/** Cómo está un correlativo: sin huecos, con todos explicados, o con alguno sin auditoría (alerta). */
export type EstadoDelCorrelativo = 'completo' | 'explicado' | 'alerta';

export const OPCIONES_DE_CLAVE: { valor: ClaveDeCorrelativo | null; texto: string }[] = [
  { valor: null, texto: 'Todos' },
  { valor: 'bancos.notas_de_credito', texto: 'Notas de crédito' },
  { valor: 'bancos.notas_de_debito', texto: 'Notas de débito' },
  { valor: 'bancos.transferencias', texto: 'Transferencias' },
];

const TEXTO_DE_LA_ACCION: Record<ExplicacionDeHueco['accion'], string> = {
  eliminar: 'Eliminado',
  corregir: 'Cambió de tipo',
};

export const textoDeLaAccion = (accion: ExplicacionDeHueco['accion']): string => TEXTO_DE_LA_ACCION[accion];

/** El título de un correlativo: su nombre y, si la empresa reinicia por año, el año. */
export const tituloDeCorrelativo = ({ nombre, anio }: Pick<Correlativo, 'nombre' | 'anio'>): string =>
  anio > 0 ? `${nombre} ${anio}` : nombre;

/** Cuántos huecos hay y cuántos son alerta (sin rastro en la auditoría). */
export function contarHuecos({ huecos }: Pick<Correlativo, 'huecos'>): { huecos: number; alertas: number } {
  return { huecos: huecos.length, alertas: huecos.filter((hueco) => hueco.estado === 'alerta').length };
}

export function estadoDelCorrelativo(correlativo: Pick<Correlativo, 'huecos'>): EstadoDelCorrelativo {
  const { huecos, alertas } = contarHuecos(correlativo);
  if (alertas > 0) return 'alerta';
  return huecos > 0 ? 'explicado' : 'completo';
}

/** Los totales de todo el reporte, para el resumen de arriba. */
export function totalesDelReporte(correlativos: readonly Correlativo[]): { huecos: number; alertas: number } {
  return correlativos.reduce(
    (total, correlativo) => {
      const { huecos, alertas } = contarHuecos(correlativo);
      return { huecos: total.huecos + huecos, alertas: total.alertas + alertas };
    },
    { huecos: 0, alertas: 0 },
  );
}
