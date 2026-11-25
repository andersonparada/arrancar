import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Activo } from '../../../dominio/activo.js';
import { BajaInvalida } from '../../../dominio/errores-de-baja.js';
import { costoFiscalDeControl, type ResultadoDelCostoFiscal } from '../../../dominio/costo-fiscal-de-control.js';
import type { CifrasDeBaja, CostoFiscalDeLaVenta } from '../../../dominio/tipos-de-baja.js';
import type { SolicitudDeBaja } from '../../dto/baja.dto.js';
import type { DependenciasDeBajas } from './dependencias-de-bajas.js';

const EN_LIBROS: CostoFiscalDeLaVenta = { origen: 'en_libros', motivo: null };

/** Las cifras de un activo con el costo fiscal de su venta y, si el contador lo cambió, el que daba la regla. */
export interface CifrasConCostoFiscal {
  cifras: CifrasDeBaja;
  costoFiscal: CostoFiscalDeLaVenta;
  segunLaRegla: ResultadoDelCostoFiscal['segunLaRegla'] | null;
}

interface PedidoDelCostoFiscal {
  activo: Activo;
  /** El primero del acto: el único que lleva la venta cuando ninguno tiene libros. */
  esPrincipal: boolean;
  solicitud: SolicitudDeBaja;
  cifras: CifrasDeBaja;
  /** Algún componente del acto lleva libros: el precio se reparte entre ellos y el principal de control no recibe venta. */
  componentesConLibros: boolean;
}

async function documentadoDe(dependencias: DependenciasDeBajas, activoId: string): Promise<number> {
  const costos = (await dependencias.costos.vigentesDeActivo(activoId)).map((costo) => costo.instantanea());
  const respaldados = costos.filter((costo) => costo.documentoDeCompraId !== null || costo.documentoDeSoporte !== null);
  return Math.max(
    0,
    respaldados.reduce((suma, costo) => suma + costo.montoCentavos, 0),
  );
}

/** El principal de una venta, si es un bien de control y le toca venta (los demás del acto no llevan precio). */
function vendeControl({ activo, esPrincipal, solicitud, componentesConLibros }: PedidoDelCostoFiscal): boolean {
  const esDeControl = activo.instantanea().tipoDeRegistro === 'bien_de_control';
  return esPrincipal && solicitud.venta !== null && esDeControl && !componentesConLibros;
}

/**
 * En el pequeño contribuyente la factura no desglosa IVA: el total va como precio y el IVA en cero.
 * @throws BajaInvalida (campo `venta.iva`) si hay IVA en la venta de un pequeño contribuyente.
 */
export async function exigirIvaSegunElRegimen(
  dependencias: DependenciasDeBajas,
  solicitud: SolicitudDeBaja,
): Promise<void> {
  if (!solicitud.venta || aCentavos(solicitud.venta.iva) === 0) return;
  const { regimenDeIva } = await dependencias.datosFiscales.en(solicitud.fecha);
  if (!regimenDeIva?.startsWith('pequeno_contribuyente')) return;
  const mensaje = 'Su factura no desglosa IVA: escriba el total como precio y 0.00 de IVA.';
  throw new BajaInvalida(mensaje, [{ campo: 'venta.iva', mensaje }]);
}

/**
 * Pone el costo fiscal de la venta (AF-9b). Un activo con libros lo trae de ellos; un bien de control que se vende lo
 * saca de `costoFiscalDeControl` con los datos fiscales de la fecha de la venta, y es el único cuya cifra se cambia: el
 * costo, la depreciación y el valor en libros siguen en cero.
 * @throws BajaInvalida si el contador escribe un costo fiscal que no corresponde a la venta de un bien de control.
 */
export async function conCostoFiscal(
  dependencias: DependenciasDeBajas,
  pedido: PedidoDelCostoFiscal,
): Promise<CifrasConCostoFiscal> {
  const { activo, esPrincipal, solicitud, cifras } = pedido;
  const delContador = solicitud.costoFiscalDelContador ?? null;
  const { id } = activo.instantanea();
  if (!vendeControl(pedido)) {
    if (delContador && esPrincipal)
      throw new BajaInvalida('El costo fiscal que escribe el contador solo vale al vender un bien de control.');
    return { cifras, costoFiscal: EN_LIBROS, segunLaRegla: null };
  }
  const resultado = costoFiscalDeControl({
    datosFiscales: await dependencias.datosFiscales.en(solicitud.fecha),
    documentadoCentavos: await documentadoDe(dependencias, id.valor),
    delContador: delContador && { montoCentavos: aCentavos(delContador.monto), motivo: delContador.motivo },
  });
  return {
    cifras: { ...cifras, costoFiscalCentavos: resultado.costoFiscalCentavos },
    costoFiscal: resultado.costoFiscal,
    segunLaRegla: delContador ? resultado.segunLaRegla : null,
  };
}
