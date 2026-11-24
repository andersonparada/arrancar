import { normalizarNit, esNitValido } from '../../core/compartido/dominio/objetos-valor/nit.js';
import { BajaInvalida, CausaDeBajaNoPermitida, FechaDeBajaAnteriorAlUso } from './errores-de-baja.js';
import { CAUSAS_DE_BAJA, type CausaDeBaja, type DatosDeBaja, type DatosDeVenta } from './tipos-de-baja.js';
import type { TipoDeRegistro } from './tipos-de-activo.js';

const DESCRIPCION_MAXIMA = 500;
const AUTORIZADA_MAXIMO = 150;
const DESTINO_MAXIMO = 300;
const DENUNCIA_MAXIMA = 60;
const COMPRADOR_MAXIMO = 150;
const FEL_MAXIMO = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lo que de afuera de la baja decide si sus datos valen: el bien, hoy y el inicio de uso. */
export interface ContextoDeBaja {
  codigoDelActivo: string;
  tipoDeRegistro: TipoDeRegistro;
  fechaDeInicioDeUso: string | null;
  hoy: string;
}

/** Lo que el tenedor de un bien ajeno no decide: venderlo, donarlo o darlo por obsoleto. */
export const CAUSAS_QUE_NO_SE_HACEN_A_TERCEROS: readonly CausaDeBaja[] = ['venta', 'donacion', 'obsolescencia'];

function limpio(valor: string | null, { nombre, maximo }: { nombre: string; maximo: number }): string | null {
  const texto = valor?.trim() ?? '';
  if (texto.length > maximo) throw new BajaInvalida(`${nombre} no puede pasar de ${maximo} caracteres.`);
  return texto || null;
}

function obligatorio(valor: string, opciones: { nombre: string; maximo: number }): string {
  const texto = limpio(valor, opciones);
  if (!texto) throw new BajaInvalida(`Escriba ${opciones.nombre}.`);
  return texto;
}

/**
 * Los bienes de terceros solo se devuelven, se destruyen, se roban, se extravían, faltan o tienen otra causa; no se
 * venden, ni se donan, ni se dan por obsoletos (el tenedor los devuelve). La venta de un bien de control se rechaza
 * mientras el usuario decide cómo se registra (tiene resultado, IVA e ISR): el mensaje no sugiere otra causa para que no
 * se oculte el ingreso.
 */
function exigirCausaDelBien(causa: DatosDeBaja['causa'], tipoDeRegistro: TipoDeRegistro): void {
  const esDeTerceros = tipoDeRegistro === 'de_terceros';
  if (causa === 'devuelto_al_dueno' && !esDeTerceros)
    throw new CausaDeBajaNoPermitida('«Devuelto al dueño» solo vale para los bienes de terceros.');
  if (causa === 'venta' && tipoDeRegistro === 'bien_de_control')
    throw new CausaDeBajaNoPermitida(
      'Esta venta aún no se puede registrar aquí; emita la factura y consulte a su contador.',
    );
  if (esDeTerceros && CAUSAS_QUE_NO_SE_HACEN_A_TERCEROS.includes(causa))
    throw new CausaDeBajaNoPermitida('Un bien de terceros no se vende ni se dona: devuélvalo a su dueño.');
}

function ventaValida(venta: DatosDeVenta): DatosDeVenta {
  if (!Number.isInteger(venta.precioCentavos) || venta.precioCentavos <= 0)
    throw new BajaInvalida('El precio de venta debe ser mayor que cero.');
  if (!Number.isInteger(venta.ivaCentavos) || venta.ivaCentavos < 0)
    throw new BajaInvalida('El IVA de la venta no puede ser negativo.');
  const nit = normalizarNit(venta.nitDelComprador);
  if (!esNitValido(nit)) throw new BajaInvalida('El NIT del comprador no es válido (revise el dígito verificador).');
  if (!UUID.test(venta.autorizacionFel.trim()))
    throw new BajaInvalida('La autorización de la factura debe ser un identificador válido.');
  return {
    ...venta,
    nitDelComprador: nit,
    comprador: obligatorio(venta.comprador, { nombre: 'el nombre del comprador', maximo: COMPRADOR_MAXIMO }),
    serieFel: limpio(venta.serieFel, { nombre: 'La serie de la factura', maximo: FEL_MAXIMO }),
    numeroFel: obligatorio(venta.numeroFel, { nombre: 'el número de la factura', maximo: FEL_MAXIMO }),
    autorizacionFel: venta.autorizacionFel.trim().toLowerCase(),
  };
}

/**
 * Valida y limpia los datos de una baja o venta (§5.12): la fecha no futura ni anterior al uso, la causa del tipo de bien,
 * y la venta completa si y solo si la causa es `venta`.
 * @throws BajaInvalida, FechaDeBajaAnteriorAlUso o CausaDeBajaNoPermitida.
 */
export function datosDeBajaValidos(datos: DatosDeBaja, contexto: ContextoDeBaja): DatosDeBaja {
  if (!CAUSAS_DE_BAJA.includes(datos.causa)) throw new BajaInvalida('La causa de la baja no es válida.');
  if (datos.fecha > contexto.hoy) throw new BajaInvalida('La fecha de la baja no puede ser futura.');
  const { fechaDeInicioDeUso, codigoDelActivo } = contexto;
  if (fechaDeInicioDeUso && datos.fecha < fechaDeInicioDeUso)
    throw new FechaDeBajaAnteriorAlUso(codigoDelActivo, fechaDeInicioDeUso);
  exigirCausaDelBien(datos.causa, contexto.tipoDeRegistro);
  if ((datos.causa === 'venta') !== (datos.venta !== null))
    throw new BajaInvalida(datos.venta ? 'Los datos de venta solo van en una venta.' : 'Faltan los datos de la venta.');
  return {
    ...datos,
    descripcion: obligatorio(datos.descripcion, { nombre: 'la descripción', maximo: DESCRIPCION_MAXIMA }),
    autorizadaPor: obligatorio(datos.autorizadaPor, { nombre: 'quién autoriza', maximo: AUTORIZADA_MAXIMO }),
    destinoDelBien: limpio(datos.destinoDelBien, { nombre: 'El destino del bien', maximo: DESTINO_MAXIMO }),
    numeroDeDenuncia: limpio(datos.numeroDeDenuncia, { nombre: 'El número de denuncia', maximo: DENUNCIA_MAXIMA }),
    venta: datos.venta ? ventaValida(datos.venta) : null,
  };
}
