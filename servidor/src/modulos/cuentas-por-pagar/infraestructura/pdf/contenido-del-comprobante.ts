import { montoLegible } from '../../../core/compartido/dominio/monto-legible.js';
import type {
  ComprobanteDePagoDto,
  ContrasenaDelComprobanteDto,
  DocumentoDelComprobanteDto,
} from '../../aplicacion/dto/comprobante-de-pago.dto.js';
import { fechaLegible } from '../../dominio/avisos.js';
import { LEYENDA_DEL_COMPROBANTE, LEYENDA_DEL_RECIBO } from '../../dominio/comprobante-de-pago.js';
import { NOMBRES_DE_TIPOS } from '../../dominio/nombres-de-tipos.js';

const IMPUESTOS = { iva: 'IVA', isr: 'ISR' } as const;
const TIPOS_DE_MEDIO: Record<string, string> = {
  cheque: 'Cheque',
  nota_de_debito: 'Nota de débito',
  nota_de_credito: 'Nota de crédito',
};

export interface FilaDelPdf {
  documento: string;
  /** Total, retenciones, notas aplicadas, pagado y saldo, ya con formato. */
  montos: [string, string, string, string, string];
  /** Una línea por retención con su constancia. */
  constancias: string[];
}

export interface TablaDelPdf {
  titulo: string;
  filas: FilaDelPdf[];
  /** «Pagado de la contraseña X Q ...», solo si hay más de un documento. */
  pie: string | null;
}

/** Lo que dice el comprobante, sin dibujar: el generador solo lo coloca en la hoja. */
export interface ContenidoDelComprobante {
  hojas: readonly string[];
  empresa: { principal: string; comercial: string | null; nit: string | null };
  titulo: string;
  anulado: string | null;
  datos: ReadonlyArray<{ rotulo: string; valor: string }>;
  posfechado: string | null;
  tablas: TablaDelPdf[];
  totales: string[];
  leyendas: readonly string[];
  firmas: ReadonlyArray<{ rotulo: string; nombre: string | null }>;
}

export const COLUMNAS_DE_LA_TABLA = [
  'Documento',
  'Total',
  'Retenciones',
  'Notas aplicadas',
  'Pagado',
  'Saldo que queda',
];

const sinCeros = (monto: string): boolean => Number(monto) === 0;

function constanciasDe(documento: DocumentoDelComprobanteDto): string[] {
  return documento.constancias.map((retencion) => {
    const constancia =
      retencion.porEmitir || !retencion.constanciaNumero
        ? 'constancia por emitir'
        : `constancia ${retencion.constanciaNumero}`;
    return `${IMPUESTOS[retencion.impuesto]} ${montoLegible(retencion.monto)} · ${constancia}`;
  });
}

function filaDe(documento: DocumentoDelComprobanteDto): FilaDelPdf {
  const identificador = documento.serie ? `${documento.serie}-${documento.numero}` : documento.numero;
  return {
    documento: `${NOMBRES_DE_TIPOS[documento.tipo]} ${identificador}`,
    montos: [
      montoLegible(documento.total),
      montoLegible(documento.retenciones),
      sinCeros(documento.notasAplicadas) ? '' : montoLegible(documento.notasAplicadas),
      montoLegible(documento.pagado),
      montoLegible(documento.saldo),
    ],
    constancias: constanciasDe(documento),
  };
}

function tablaDe(contrasena: ContrasenaDelComprobanteDto): TablaDelPdf {
  return {
    titulo: `Contraseña ${contrasena.numero}`,
    filas: contrasena.documentos.map(filaDe),
    pie:
      contrasena.documentos.length > 1
        ? `Pagado de la contraseña ${contrasena.numero}: ${montoLegible(contrasena.pagado)}`
        : null,
  };
}

function datosDe(comprobante: ComprobanteDePagoDto): Array<{ rotulo: string; valor: string }> {
  const { proveedor, pago, medio, retiro } = comprobante;
  const posibles: Array<[string, string | null]> = [
    ['Proveedor', proveedor.nombre],
    ['NIT', proveedor.nit],
    ['A nombre de', comprobante.beneficiario],
    ['Fecha', fechaLegible(pago.fecha)],
    [
      'Documento bancario',
      medio && `${TIPOS_DE_MEDIO[medio.tipo] ?? medio.tipo} ${medio.numero} · ${medio.cuentaBancariaNombre}`,
    ],
    ['Retiro de efectivo', retiro && `${retiro.numero} · custodio ${retiro.custodio}`],
    ['Referencia', pago.referencia],
    ['Motivo', pago.motivo],
    ['Observaciones', pago.observaciones],
  ];
  return posibles.flatMap(([rotulo, valor]) => (valor ? [{ rotulo, valor }] : []));
}

function empresaDe({ empresa }: ComprobanteDePagoDto): ContenidoDelComprobante['empresa'] {
  const principal = empresa.razonSocial || empresa.nombre;
  const distinto = empresa.nombreComercial && empresa.nombreComercial !== principal;
  return { principal, comercial: distinto ? empresa.nombreComercial : null, nit: empresa.nit };
}

/** El PDF siempre dice que no es un documento tributario, aunque la lista de leyendas viniera sin ella. */
function leyendasDe(comprobante: ComprobanteDePagoDto): string[] {
  const dice = comprobante.leyendas.some((leyenda) => /no es un documento tributario/i.test(leyenda));
  if (dice) return [...comprobante.leyendas];
  return [...comprobante.leyendas, comprobante.esReciboDeEfectivo ? LEYENDA_DEL_RECIBO : LEYENDA_DEL_COMPROBANTE];
}

/** El comprobante de un pago, con sus leyendas, constancias y la marca del cheque posfechado. */
export function contenidoDelComprobante(comprobante: ComprobanteDePagoDto): ContenidoDelComprobante {
  const { pago, firmas } = comprobante;
  return {
    hojas: comprobante.hojas,
    empresa: empresaDe(comprobante),
    titulo: `${comprobante.titulo} No. ${pago.numero}`,
    anulado: pago.anulacion ? `ANULADO — ${pago.anulacion.motivo}` : null,
    datos: datosDe(comprobante),
    posfechado: pago.posfechado ? `Cheque posfechado al ${fechaLegible(pago.fecha)}` : null,
    tablas: comprobante.contrasenas.map(tablaDe),
    totales: [
      `Total pagado ${montoLegible(comprobante.totalPagado)}`,
      comprobante.totalEnLetras,
      `Retenciones ${montoLegible(comprobante.totalRetenciones)} · total que cubre ${montoLegible(comprobante.totalCubierto)}`,
    ],
    leyendas: leyendasDe(comprobante),
    firmas: [firmas.entrega, firmas.recibe],
  };
}
