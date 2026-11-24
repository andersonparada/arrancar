export type NivelDeHallazgo = 'aviso' | 'bloquea';

/** Algo que quien cierra debe saber (`aviso`) o resolver (`bloquea`) antes de cerrar el mes (§6.11). */
export interface Hallazgo {
  nivel: NivelDeHallazgo;
  codigo: string;
  mensaje: string;
  cantidad: number;
  /** Referencias de lo afectado (por ejemplo «Recepción 3»), para ir a buscarlo; hasta diez. */
  detalle: string[];
  /** El módulo que lo dijo, si no fue Inventarios. */
  modulo?: string;
}

/** Un grupo de cosas que cumple una condición: cuántas son y las primeras referencias. */
export interface GrupoDeReferencias {
  cantidad: number;
  referencias: string[];
}

/** Lo que las consultas encontraron en la base, sin interpretar. */
export interface DatosParaHallazgos {
  cargaInicialAbierta: boolean;
  /** Hay renglones de saldo inicial vigentes. */
  conSaldosIniciales: boolean;
  recepcionesDeDocumentosAnulados: GrupoDeReferencias;
  lineasEnLaBandeja: number;
  /** Traslados que salieron y no se habían recibido al final del mes. */
  trasladosEnTransito: number;
  /** Lotes con existencia al final del mes cuyo vencimiento ya había pasado. */
  lotesVencidos: number;
}

const concordar = (cantidad: number, uno: string, varios: string): string =>
  `${cantidad} ${cantidad === 1 ? uno : varios}`;

const mesDe = (periodo: string): string => periodo.slice(0, 7);

/** El bloqueo de un mes que no es el siguiente: no se calcula, solo se dice cuál cerrar primero. */
export function hallazgoDeMesAnteriorSinCerrar(siguiente: string): Hallazgo {
  const mensaje = `Primero cierre el mes ${mesDe(siguiente)}: los meses se cierran en orden.`;
  return { nivel: 'bloquea', codigo: 'mes_anterior_sin_cerrar', mensaje, cantidad: 1, detalle: [mesDe(siguiente)] };
}

/** El bloqueo de un mes posterior al mes en curso. */
export function hallazgoDeMesPorLlegar(periodo: string): Hallazgo {
  const mensaje = `El mes ${mesDe(periodo)} todavía no llega: solo se cierra el mes en curso o uno anterior.`;
  return { nivel: 'bloquea', codigo: 'mes_por_llegar', mensaje, cantidad: 1, detalle: [mesDe(periodo)] };
}

function bloqueos(datos: DatosParaHallazgos): Hallazgo[] {
  const { cargaInicialAbierta, conSaldosIniciales, recepcionesDeDocumentosAnulados: anuladas } = datos;
  const hallazgos: Hallazgo[] = [];
  if (cargaInicialAbierta && conSaldosIniciales) {
    const mensaje =
      'La carga inicial de la empresa sigue abierta y hay saldos iniciales de inventario: ciérrela primero.';
    hallazgos.push({ nivel: 'bloquea', codigo: 'carga_inicial_abierta', mensaje, cantidad: 1, detalle: [] });
  }
  if (anuladas.cantidad > 0) {
    const mensaje = `${concordar(anuladas.cantidad, 'recepción vigente viene', 'recepciones vigentes vienen')} de documentos anulados del libro de compras: anúlelas.`;
    hallazgos.push({
      nivel: 'bloquea',
      codigo: 'recepciones_de_documentos_anulados',
      mensaje,
      cantidad: anuladas.cantidad,
      detalle: anuladas.referencias,
    });
  }
  return hallazgos;
}

function aviso(codigo: string, cantidad: number, mensaje: string): Hallazgo[] {
  return cantidad === 0 ? [] : [{ nivel: 'aviso', codigo, mensaje, cantidad, detalle: [] }];
}

function avisos(datos: DatosParaHallazgos): Hallazgo[] {
  const { lineasEnLaBandeja: lineas, trasladosEnTransito: traslados, lotesVencidos: lotes } = datos;
  return [
    ...aviso(
      'lineas_por_recibir',
      lineas,
      `${concordar(lineas, 'línea sigue', 'líneas siguen')} en la bandeja «Por recibir» con fecha de este mes o anterior.`,
    ),
    ...aviso(
      'traslados_en_transito',
      traslados,
      `${concordar(traslados, 'traslado va', 'traslados van')} en tránsito: queda como «En tránsito interno» en las existencias del cierre.`,
    ),
    ...aviso(
      'lotes_vencidos',
      lotes,
      `${concordar(lotes, 'lote vencido tiene', 'lotes vencidos tienen')} existencia: considere el deterioro.`,
    ),
  ];
}

/** Los hallazgos de Inventarios sobre un mes que sí se calcula: primero los bloqueos y luego los avisos. */
export function hallazgosDelCierre(datos: DatosParaHallazgos): Hallazgo[] {
  return [...bloqueos(datos), ...avisos(datos)];
}
