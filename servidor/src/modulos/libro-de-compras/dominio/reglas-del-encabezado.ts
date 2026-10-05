import { Dpi, DpiInvalido } from '../../core/compartido/dominio/objetos-valor/dpi.js';
import { Nit, NitInvalido } from '../../core/compartido/dominio/objetos-valor/nit.js';
import {
  DatosDeLaFelIncompletos,
  NitDelEmisorInvalido,
  NitDelEmisorNoCoincide,
  ReceptorInvalido,
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

const AYUDA_DE_REGIMEN = ' Si el proveedor cambió de régimen, actualice sus datos fiscales o confirme.';

function tipoIncoherente(tipo: TipoDeDocumento, proveedorEsPequeno: boolean): string | null {
  if (tipo === 'factura_pequeno_contribuyente' && !proveedorEsPequeno) {
    return 'El proveedor no es pequeño contribuyente: registre una factura normal.';
  }
  if (tipo === 'factura' && proveedorEsPequeno) {
    return 'El proveedor es pequeño contribuyente: registre una factura de pequeño contribuyente.';
  }
  return null;
}

/**
 * Una factura de pequeño contribuyente es de un proveedor de ese régimen, y las facturas generales no. Si no
 * corresponde, es un error, salvo que el usuario confirme que el proveedor cambió de régimen (la factura es
 * anterior al cambio): entonces pasa y devuelve `true`, para avisar y auditar.
 * @throws TipoNoCorrespondeAlProveedor si no corresponde y no se confirmó.
 */
export function exigirTipoDelProveedor(
  tipo: TipoDeDocumento,
  proveedorEsPequeno: boolean,
  confirmarCambioDeRegimen = false,
): boolean {
  const mensaje = tipoIncoherente(tipo, proveedorEsPequeno);
  if (mensaje === null) return false;
  if (confirmarCambioDeRegimen) return true;
  throw new TipoNoCorrespondeAlProveedor(`${mensaje}${AYUDA_DE_REGIMEN}`, { confirmarCon: 'confirmarCambioDeRegimen' });
}

export const AVISO_DE_CAMBIO_DE_REGIMEN =
  'El proveedor cambió de régimen: confirme que la factura es anterior al cambio.';

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
  if (nitReceptor === null) throw new MotivoFueraDelLibroIncoherente('Escriba el NIT o CUI al que se emitió la FEL.');
  if ((nitReceptor === 'CF') !== (motivo === 'fel_a_consumidor_final')) {
    throw new MotivoFueraDelLibroIncoherente(
      'El NIT o CUI del receptor no concuerda con el motivo de dejarla fuera del libro.',
    );
  }
}

/**
 * El NIT o CUI al que dice el documento que se emitió la FEL, normalizado; sin texto es `null`.
 * @throws ReceptorInvalido si no es un NIT ni un CUI válido.
 */
export function receptorDelDocumento(texto: string | null): string | null {
  if (!texto?.trim()) return null;
  try {
    return Nit.crear(texto).valor;
  } catch (error) {
    if (!(error instanceof NitInvalido)) throw error;
  }
  try {
    return Dpi.crear(texto).valor;
  } catch (error) {
    if (error instanceof DpiInvalido) throw new ReceptorInvalido(texto);
    throw error;
  }
}
