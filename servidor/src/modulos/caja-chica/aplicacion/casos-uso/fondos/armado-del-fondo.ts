import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { CambioDeMonto, CustodioDelFondo, Fondo } from '../../../dominio/fondos.js';
import { efectivoEsperado } from '../../../dominio/monto-del-fondo.js';
import type { CambioDeMontoDto, CustodioDto, FondoDto, FondoResumenDto } from '../../dto/fondos.dto.js';
import type { DatosDeLectura } from '../../puertos/puertos-de-fondos.js';

/** Un fondo cerrado ya no tiene efectivo a su cargo: su monto es cero. */
function cifrasDe(fondo: Fondo, datos: DatosDeLectura): DatosDeLectura {
  return fondo.estado === 'cerrado'
    ? { ...datos, montoCentavos: 0, pendienteCentavos: 0, valesCentavos: 0, valeMasViejo: null }
    : datos;
}

/** El aviso de los documentos que su emisor anuló y siguen sin resolverse (reemplazo, devolución, cobro o pérdida). */
const avisoDeDocumentosPorResolver = (cantidad: number): string[] =>
  cantidad === 0
    ? []
    : [`${cantidad} documento(s) anulado(s) por su emisor sin resolver: no dan crédito fiscal ni son deducibles.`];

/** La fila de la lista: lo del fondo con sus cifras (§2.3 del diseño). */
export function resumenDelFondo(fondo: Fondo, lectura: DatosDeLectura): FondoResumenDto {
  const datos = cifrasDe(fondo, lectura);
  return {
    id: fondo.id,
    nombre: fondo.nombre,
    localidadId: fondo.localidadId,
    localidadNombre: datos.localidadNombre,
    custodio: datos.custodio,
    custodioUsuarioId: datos.custodioUsuarioId,
    estado: fondo.estado,
    fechaDeApertura: fondo.fechaDeApertura,
    aperturaAnulada: datos.aperturaAnulada,
    monto: deCentavos(datos.montoCentavos),
    efectivoEsperado: deCentavos(efectivoEsperado(datos)),
    pendienteDeReponer: deCentavos(fondo.estado === 'cerrado' ? 0 : datos.pendienteCentavos),
    valesAbiertos: deCentavos(datos.valesCentavos),
    valeMasViejo: datos.valeMasViejo,
    ultimoArqueo: datos.ultimoArqueo,
    documentosPorResolver: datos.documentosPorResolver,
    avisos: avisoDeDocumentosPorResolver(datos.documentosPorResolver),
  };
}

/** El tope mayor que el monto del fondo se acepta (es política interna), pero no tendrá efecto: se avisa. */
function avisoDelTope(fondo: Fondo, lectura: DatosDeLectura): string[] {
  const { topeCentavos, estado } = fondo;
  if (estado !== 'abierto' || topeCentavos === null || topeCentavos <= lectura.montoCentavos) return [];
  return ['El tope es mayor que el fondo y no tendrá efecto.'];
}

const custodioDto = ({ id: _id, ...custodio }: CustodioDelFondo): CustodioDto => custodio;

const cambioDto = ({ montoCentavos, ...cambio }: CambioDeMonto): CambioDeMontoDto => ({
  ...cambio,
  monto: deCentavos(montoCentavos),
});

/** Todo lo que hace falta para armar la ficha. */
export interface FondoPorArmar {
  fondo: Fondo;
  lectura: DatosDeLectura;
  custodios: readonly CustodioDelFondo[];
  cambios: readonly CambioDeMonto[];
  /** El fondo no tiene comprobantes, arqueos, vales ni reposiciones. */
  sinUso: boolean;
  avisos: readonly string[];
}

/** La ficha del fondo con su historial; qué se puede hacer sale de su estado. */
export function fichaDelFondo(por: FondoPorArmar): FondoDto {
  const { fondo, cambios } = por;
  const abierto = fondo.estado === 'abierto';
  const resumen = resumenDelFondo(fondo, por.lectura);
  const vigentes = cambios.filter(({ estado }) => estado === 'vigente');
  const soloLaApertura = vigentes.length === 1 && vigentes[0]!.tipo === 'apertura';
  return {
    ...resumen,
    avisos: [...resumen.avisos, ...por.avisos, ...avisoDelTope(fondo, por.lectura)],
    topePorComprobante: fondo.topeCentavos === null ? null : deCentavos(fondo.topeCentavos),
    cuentaBancariaId: fondo.cuentaBancariaId,
    cuentaBancariaNombre: por.lectura.cuentaBancariaNombre,
    fechaDeCierre: fondo.fechaDeCierre,
    motivoDeCierre: fondo.motivoDeCierre,
    observaciones: fondo.observaciones,
    custodios: por.custodios.map(custodioDto),
    cambiosDeMonto: cambios.map(cambioDto),
    puedeEditar: abierto,
    puedeAumentar: abierto,
    puedeDisminuir: abierto,
    puedeCambiarCustodio: abierto,
    puedeAnularApertura: abierto && soloLaApertura && por.sinUso,
  };
}
