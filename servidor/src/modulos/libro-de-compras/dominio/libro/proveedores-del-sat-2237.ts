import type { DocumentoDelLibro } from './documento-del-libro.js';

export interface ProveedorDelSat2237 {
  /** NIT del proveedor; en la factura especial, NIT o CUI del vendedor. */
  nit: string | null;
  nombre: string;
  cantidadDeFacturas: number;
  cantidadDeNotasDeCredito: number;
  cantidadDeNotasDeDebito: number;
  /** Centavos, con las notas neteadas en su proveedor. */
  base: number;
  credito: number;
  /** Cuando el neto queda en cero o negativo (p. ej. nota de crédito de una factura de otro período). */
  aviso: string | null;
}

export interface DetalleDeProveedores {
  filas: ProveedorDelSat2237[];
  total: { cantidadDeFacturas: number; base: number; credito: number };
}

const AVISO_NETO_NO_POSITIVO =
  'El neto de este proveedor es cero o negativo: revise si una nota corresponde a una factura de otro período.';

const signoDe = (d: DocumentoDelLibro): 1 | -1 => (d.tipo === 'nota_de_credito' ? -1 : 1);
const esNota = (d: DocumentoDelLibro) => d.tipo === 'nota_de_credito' || d.tipo === 'nota_de_debito';
const uno = (condicion: boolean) => (condicion ? 1 : 0);

function nuevoProveedor(d: DocumentoDelLibro): ProveedorDelSat2237 {
  return {
    nit: d.nitDelProveedor,
    nombre: d.nombreDelProveedor,
    cantidadDeFacturas: 0,
    cantidadDeNotasDeCredito: 0,
    cantidadDeNotasDeDebito: 0,
    base: 0,
    credito: 0,
    aviso: null,
  };
}

/** Suma un documento al proveedor; el nombre es el del documento más reciente (llegan por fecha de emisión). */
function acumular(previo: ProveedorDelSat2237, d: DocumentoDelLibro): ProveedorDelSat2237 {
  return {
    ...previo,
    nombre: d.nombreDelProveedor,
    cantidadDeFacturas: previo.cantidadDeFacturas + uno(!esNota(d)),
    cantidadDeNotasDeCredito: previo.cantidadDeNotasDeCredito + uno(d.tipo === 'nota_de_credito'),
    cantidadDeNotasDeDebito: previo.cantidadDeNotasDeDebito + uno(d.tipo === 'nota_de_debito'),
    base: previo.base + signoDe(d) * d.base,
    credito: previo.credito + signoDe(d) * (d.iva - d.ivaNoAcreditable),
  };
}

function agrupar(documentos: DocumentoDelLibro[]): DetalleDeProveedores {
  const grupos = new Map<string, ProveedorDelSat2237>();
  for (const d of documentos) {
    const clave = d.nitDelProveedor ?? `sin-nit:${d.proveedorId}`;
    grupos.set(clave, acumular(grupos.get(clave) ?? nuevoProveedor(d), d));
  }
  const filas = [...grupos.values()]
    .map((p) => ({ ...p, aviso: p.base <= 0 || p.credito <= 0 ? AVISO_NETO_NO_POSITIVO : null }))
    .sort((a, b) => b.credito - a.credito || (a.nit ?? '').localeCompare(b.nit ?? ''));
  const total = {
    cantidadDeFacturas: filas.reduce((suma, p) => suma + p.cantidadDeFacturas, 0),
    base: filas.reduce((suma, p) => suma + p.base, 0),
    credito: filas.reduce((suma, p) => suma + p.credito, 0),
  };
  return { filas, total };
}

/**
 * El detalle de proveedores del crédito: documentos con crédito agrupados por NIT, con las notas neteadas en su
 * proveedor, del más a menos crédito. Las facturas especiales van aparte, por NIT o CUI del vendedor.
 */
export function proveedoresDelSat2237(documentos: DocumentoDelLibro[]): {
  proveedores: DetalleDeProveedores;
  facturasEspeciales: DetalleDeProveedores;
} {
  const conCredito = documentos.filter((d) => d.motivoSinCredito === null);
  return {
    proveedores: agrupar(conCredito.filter((d) => d.tipo !== 'factura_especial')),
    facturasEspeciales: agrupar(conCredito.filter((d) => d.tipo === 'factura_especial')),
  };
}
