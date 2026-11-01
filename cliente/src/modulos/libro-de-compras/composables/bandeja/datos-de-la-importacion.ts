import type { LoteDeDte } from '../../servicios/dte-recibidos.api';

const EXTENSIONES_ADMITIDAS = ['.xls', '.xlsx', '.csv'];

/** Solo por la extensión, para avisar antes de subir; el servidor revisa el contenido de verdad. */
export function extensionAdmitida(nombre: string): boolean {
  const minuscula = nombre.toLowerCase();
  return EXTENSIONES_ADMITIDAS.some((extension) => minuscula.endsWith(extension));
}

const MOTIVOS_DE_RECHAZO: Record<string, string> = {
  dato_ilegible: 'Un dato no se puede leer',
  tipo_sin_familia: 'Tipo de documento que no se registra aquí',
  nit_receptor_distinto: 'El receptor no es esta empresa',
  moneda_no_admitida: 'La moneda no es quetzales',
  total_en_cero: 'El total es cero',
  impuestos_exceden_total: 'Los impuestos pasan del total',
  autorizacion_repetida: 'La autorización se repite con otros datos',
};

/** El motivo de un rechazo en palabras; un motivo que el cliente no conoce se muestra tal cual. */
export function textoDelMotivo(motivo: string): string {
  return MOTIVOS_DE_RECHAZO[motivo] ?? motivo;
}

export interface LineaDelResumen {
  etiqueta: string;
  cantidad: number;
}

/** Las cuentas del lote que se muestran; las que están en cero no dicen nada y se omiten (salvo las nuevas). */
export function lineasDelResumen(lote: LoteDeDte): LineaDelResumen[] {
  const lineas: LineaDelResumen[] = [
    { etiqueta: 'DTE nuevos en pendientes', cantidad: lote.filasNuevas },
    { etiqueta: 'DTE que cambiaron en la SAT', cantidad: lote.filasActualizadas },
    { etiqueta: 'DTE que ya estaban igual', cantidad: lote.filasSinCambio },
    { etiqueta: 'Anulados en la SAT', cantidad: lote.anuladasEnLaSat },
    { etiqueta: 'Filas que no entraron', cantidad: lote.filasRechazadas },
  ];
  return lineas.filter(({ cantidad }, i) => i === 0 || cantidad > 0);
}

/** La frase que resume la carga. */
export function titularDelResultado(lote: LoteDeDte): string {
  if (lote.filasLeidas === 0) return 'El archivo no tenía filas con datos.';
  const nuevos = lote.filasNuevas === 1 ? '1 DTE nuevo' : `${lote.filasNuevas} DTE nuevos`;
  return `Se leyeron ${lote.filasLeidas} filas: ${nuevos}.`;
}

/** `true` si algo no entró y el usuario debe revisarlo. */
export const hayRechazos = (lote: LoteDeDte): boolean => lote.filasRechazadas > 0;

/** Los rechazos que el lote trae son hasta 1,000; si hubo más, se avisa. */
export const rechazosRecortados = (lote: LoteDeDte): boolean => lote.rechazos.length < lote.filasRechazadas;
