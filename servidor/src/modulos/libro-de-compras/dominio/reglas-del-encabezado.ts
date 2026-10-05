import { Nit } from '../../core/compartido/dominio/objetos-valor/nit.js';
import {
  DatosDeLaFelIncompletos,
  NitDelEmisorInvalido,
  NitDelEmisorNoCoincide,
  ReciboDebeQuedarFueraDelLibro,
  TipoNoCorrespondeAlProveedor,
} from './errores-de-documento.js';
import { MotivoFueraDelLibroIncoherente, type MotivoFueraDelLibro } from './fuera-del-libro.js';
import type { TipoDeDocumento } from './tipos-de-documento.js';

/** Lo que dice el documento y el proveedor para decidir quién es el emisor. */
export interface DatosDelEmisor {
  muestraEnReportesSat: boolean;
  /** NIT del emisor que escribió el usuario (del DTE); solo cuenta si el documento va en el libro. */
  nitEmisor: string | null;
  serie: string | null;
  autorizacionFel: string | null;
  /** NIT del proveedor en Terceros, normalizado; `null` si no tiene. */
  nitDelProveedor: string | null;
}

export interface EmisorResuelto {
  /** Lo que se guarda en `nit_emisor`: nunca `CF`. */
  nitEmisor: string | null;
  /** El proveedor no tiene NIT: hay que mandarle `terceros.completar_nit` con este. */
  nitParaCompletar: string | null;
}

function exigirDatosDeSat(datos: DatosDelEmisor): void {
  const faltantes = [
    datos.nitEmisor ? null : 'el NIT del emisor',
    datos.serie ? null : 'la serie',
    datos.autorizacionFel ? null : 'la autorización de la FEL',
  ].filter((falta) => falta !== null);
  if (faltantes.length > 0) {
    throw new DatosDeLaFelIncompletos(`Un documento del libro necesita ${faltantes.join(', ')}.`);
  }
}

function nitDelDocumento(texto: string): string {
  const nit = Nit.crear(texto);
  if (nit.esConsumidorFinal()) throw new NitDelEmisorInvalido('El NIT del emisor no puede ser consumidor final.');
  return nit.valor;
}

/**
 * H10. En el libro: el NIT del emisor (del DTE), la serie y la FEL son obligatorios; si el proveedor no tiene NIT
 * se le pone ese, y si tiene otro es un error. Fuera del libro: el emisor es el NIT del proveedor, si lo tiene.
 * @throws DatosDeLaFelIncompletos, NitInvalido, NitDelEmisorInvalido o NitDelEmisorNoCoincide.
 */
export function resolverEmisor(datos: DatosDelEmisor): EmisorResuelto {
  const delProveedor = datos.nitDelProveedor;
  if (!datos.muestraEnReportesSat) {
    return { nitEmisor: delProveedor === 'CF' ? null : delProveedor, nitParaCompletar: null };
  }
  exigirDatosDeSat(datos);
  const nitEmisor = nitDelDocumento(datos.nitEmisor ?? '');
  if (delProveedor === null) return { nitEmisor, nitParaCompletar: nitEmisor };
  if (delProveedor !== nitEmisor) throw new NitDelEmisorNoCoincide();
  return { nitEmisor, nitParaCompletar: null };
}

/** Una factura de pequeño contribuyente es de un proveedor de ese régimen, y las facturas generales no. */
export function exigirTipoDelProveedor(tipo: TipoDeDocumento, proveedorEsPequeno: boolean): void {
  if (tipo === 'factura_pequeno_contribuyente' && !proveedorEsPequeno) {
    throw new TipoNoCorrespondeAlProveedor('El proveedor no es pequeño contribuyente: registre una factura normal.');
  }
  if (tipo === 'factura' && proveedorEsPequeno) {
    throw new TipoNoCorrespondeAlProveedor(
      'El proveedor es pequeño contribuyente: registre una factura de pequeño contribuyente.',
    );
  }
}

/** El recibo solo va con la casilla «Se muestra en reportes SAT» desmarcada. */
export function exigirReciboFueraDelLibro(tipo: TipoDeDocumento, muestraEnReportesSat: boolean): void {
  if (tipo === 'recibo' && muestraEnReportesSat) throw new ReciboDebeQuedarFueraDelLibro();
}

/**
 * Una FEL que queda fuera del libro dice a quién se emitió: consumidor final (`CF`) u otro NIT. Sin ese dato no
 * se podría comprobar que no es a la empresa.
 * @throws MotivoFueraDelLibroIncoherente si falta el NIT del receptor o no concuerda con el motivo.
 */
export function exigirReceptorCoherente(motivo: MotivoFueraDelLibro | null, nitReceptor: string | null): void {
  if (motivo !== 'fel_a_consumidor_final' && motivo !== 'fel_a_otro_nit') return;
  if (nitReceptor === null) throw new MotivoFueraDelLibroIncoherente('Escriba el NIT al que se emitió la FEL.');
  if ((nitReceptor === 'CF') !== (motivo === 'fel_a_consumidor_final')) {
    throw new MotivoFueraDelLibroIncoherente(
      'El NIT del receptor no concuerda con el motivo de dejarla fuera del libro.',
    );
  }
}
