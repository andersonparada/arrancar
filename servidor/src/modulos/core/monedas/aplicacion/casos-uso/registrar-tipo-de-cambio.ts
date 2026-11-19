import { RecursoNoEncontrado } from '../../../compartido/aplicacion/errores.js';
import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import { TipoDeCambio } from '../../../compartido/dominio/tipo-de-cambio.js';
import { exigirMonedaExtranjera } from '../../dominio/moneda.js';
import type { CatalogoDeMonedas } from '../puertos/monedas.js';
import type { TipoDeCambioDto, TiposDeCambioGuardados } from '../puertos/tipos-de-cambio-guardados.js';
import type { TiposDeCambio } from '../tipos-de-cambio.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  guardados: TiposDeCambioGuardados;
  catalogo: CatalogoDeMonedas;
  tiposDeCambio: Pick<TiposDeCambio, 'invalidar'>;
}

/** Lo que soporte escribe: el tipo, su día y el motivo (compra y venta, si el comprobante las trae). */
export interface SolicitudDeTipoManual {
  moneda: string;
  fecha: string;
  referencia: string;
  compra?: string | null;
  venta?: string | null;
  motivo: string;
}

const comoTipo = (texto: string | null | undefined): string | null => (texto ? TipoDeCambio.crear(texto).valor : null);

/**
 * Soporte ingresa el tipo de un día a mano (el Banguat no respondió) o corrige el que hay. Siempre agrega una versión
 * nueva con su motivo y quién la registró: nada se cambia ni se borra, y la tabla es su propio rastro.
 */
export class RegistrarTipoDeCambio {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws TipoDeCambioDelQuetzal si la moneda es el quetzal.
   * @throws TipoDeCambioInvalido si un valor no es un decimal positivo de hasta 8 decimales.
   * @throws RecursoNoEncontrado si la moneda no existe.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeTipoManual): Promise<TipoDeCambioDto> {
    const { unidadDeTrabajo, guardados, catalogo, tiposDeCambio } = this.dependencias;
    exigirMonedaExtranjera(solicitud.moneda);
    const nuevo = {
      moneda: solicitud.moneda,
      fecha: solicitud.fecha,
      referencia: TipoDeCambio.crear(solicitud.referencia).valor,
      compra: comoTipo(solicitud.compra),
      venta: comoTipo(solicitud.venta),
      motivo: solicitud.motivo,
      usuarioId: operador.usuarioId,
    };
    const creado = await unidadDeTrabajo.ejecutar(operador, async () => {
      if (!(await catalogo.buscar(solicitud.moneda))) throw new RecursoNoEncontrado('La moneda');
      return guardados.agregarManual(nuevo);
    });
    tiposDeCambio.invalidar();
    return creado;
  }
}
