import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { RetencionDelLibro } from '../../dominio/avisos-de-pagos.js';
import { estaPosfechado, numeroDelPago, pagadoYComprometido } from '../../dominio/pagos.js';
import type { LineaConRetencion } from '../casos-uso/pagos/avisos-del-pago.js';
import type { FichaDelMovimiento } from '../puertos/puertos-de-pagos.js';
import type { ExtrasDelPago, FilaDeListaDePagos } from '../puertos/puertos-de-lista-de-pagos.js';
import type {
  AplicacionDeLaFichaDto,
  FichaDePagoDto,
  PagoResumenDto,
  RetencionDeLaLineaDto,
} from './ficha-de-pago.dto.js';
import type { PagoDto } from './registro-de-pago.dto.js';

/** Junta los elementos de una misma contraseña, en el orden en que cada contraseña aparece por primera vez. */
export function juntarPorContrasena<T extends { contrasena: { id: string } }>(elementos: readonly T[]): T[] {
  const ids = [...new Set(elementos.map(({ contrasena }) => contrasena.id))];
  return ids.flatMap((id) => elementos.filter(({ contrasena }) => contrasena.id === id));
}

/** Una retención sin número de constancia está «por emitir». */
export const dtoDeRetencion = (retencion: RetencionDelLibro): RetencionDeLaLineaDto => ({
  impuesto: retencion.impuesto,
  monto: deCentavos(retencion.montoCentavos),
  fecha: retencion.fecha,
  constanciaNumero: retencion.constanciaNumero,
  porEmitir: retencion.constanciaNumero === null,
});

/** Lo que se necesita para armar la ficha de un pago. */
export interface DatosDeLaFicha {
  base: PagoDto;
  lineas: readonly LineaConRetencion[];
  movimiento: (FichaDelMovimiento & { id: string }) | null;
  extras: ExtrasDelPago;
  retenciones: ReadonlyMap<string, RetencionDelLibro[]>;
  /** `AAAA-MM-DD` de la empresa: separa lo comprometido (pagos posfechados) de lo pagado. */
  hoy: string;
  /** El tope de la diferencia de centavos de la empresa; 0 la apaga. */
  topeDeDiferenciaCentavos: number;
  puedeAnular: boolean;
  puedeReaplicar: boolean;
}

/** El residuo que se puede dar por saldado: lo que le queda al cargo si cabe en el tope, en un pago vigente con dinero. */
function diferenciaOfrecible(datos: DatosDeLaFicha, saldoCentavos: number): number {
  const { base, topeDeDiferenciaCentavos } = datos;
  const sirve = base.estado === 'vigente' && base.forma !== 'cuenta_de_apertura';
  return sirve && saldoCentavos > 0 && saldoCentavos <= topeDeDiferenciaCentavos ? saldoCentavos : 0;
}

/** Lo del documento cubierto con pagos de fecha posterior a hoy. */
const comprometidoDe = ({ fila }: LineaConRetencion, hoy: string): number =>
  pagadoYComprometido(fila.pagosVigentes, hoy).comprometidoCentavos;

function dtoDeLaAplicacion(datos: DatosDeLaFicha, indice: number): AplicacionDeLaFichaDto {
  const linea = datos.lineas[indice]!;
  return {
    ...datos.base.aplicaciones[indice]!,
    notasAplicadas: deCentavos(linea.fila.aplicadoAlCargoCentavos),
    saldoDelDocumento: deCentavos(linea.saldoCentavos + comprometidoDe(linea, datos.hoy)),
    disponibleDelDocumento: deCentavos(linea.saldoCentavos),
    diferenciaOfrecible: deCentavos(diferenciaOfrecible(datos, linea.saldoCentavos)),
    retencionesDelLibro: (datos.retenciones.get(linea.fila.documento.id) ?? []).map(dtoDeRetencion),
  };
}

const retiroDe = (extras: ExtrasDelPago) =>
  extras.retiro && {
    id: extras.retiro.id,
    numero: numeroDelPago(extras.retiro.numero, extras.retiro.anioDeNumero),
    custodio: extras.retiro.custodio,
    estado: extras.retiro.estado,
  };

/** El pago como lo muestra su ficha: el `PagoDto` con Bancos, las líneas ampliadas y lo que se puede hacer. */
export function dtoDeLaFicha(datos: DatosDeLaFicha): FichaDePagoDto {
  const { base, movimiento, extras } = datos;
  const { movimiento: _movimiento, avisos: _avisos, aplicaciones: _aplicaciones, ...resto } = base;
  const aplicaciones = juntarPorContrasena(base.aplicaciones.map((_, indice) => dtoDeLaAplicacion(datos, indice)));
  return {
    ...resto,
    referencia: extras.referencia,
    recibidoPor: extras.recibidoPor,
    motivoSinBancarizar: extras.motivoSinBancarizar,
    movimiento,
    conciliado: movimiento?.conciliado ?? false,
    retiro: retiroDe(extras) ?? null,
    aplicaciones,
    creadoPorNombre: extras.creadoPorNombre,
    creadoEn: extras.creadoEn,
    puedeAnular: datos.puedeAnular,
    puedeReaplicar: datos.puedeReaplicar,
    puedeSaldarDiferencia: aplicaciones.some(({ diferenciaOfrecible: ofrecible }) => ofrecible !== '0.00'),
  };
}

/** Una fila de la lista; un pago vigente con fecha posterior a hoy está posfechado. */
export const dtoDeResumenDePago = (fila: FilaDeListaDePagos, hoy: string): PagoResumenDto => ({
  id: fila.id,
  numero: numeroDelPago(fila.numero, fila.anioDeNumero),
  proveedor: fila.proveedor,
  contrasenas: fila.contrasenas.map(({ id, numero, anioDeNumero }) => ({
    id,
    numero: numeroDelPago(numero, anioDeNumero),
  })),
  forma: fila.forma,
  fecha: fila.fecha,
  posfechado: fila.estado === 'vigente' && estaPosfechado(fila, hoy),
  monto: deCentavos(fila.montoCentavos),
  estado: fila.estado,
  fechaDeAnulacion: fila.fechaDeAnulacion,
  movimiento: fila.movimiento,
  retiro: fila.retiro && {
    id: fila.retiro.id,
    numero: numeroDelPago(fila.retiro.numero, fila.retiro.anioDeNumero),
    custodio: fila.retiro.custodio,
  },
});
