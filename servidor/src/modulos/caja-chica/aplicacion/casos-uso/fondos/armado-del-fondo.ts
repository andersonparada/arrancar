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
    avisos: [],
  };
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
  const vigentes = cambios.filter(({ estado }) => estado === 'vigente');
  const soloLaApertura = vigentes.length === 1 && vigentes[0]!.tipo === 'apertura';
  return {
    ...resumenDelFondo(fondo, por.lectura),
    avisos: [...por.avisos],
    topePorComprobante: fondo.topeCentavos === null ? null : deCentavos(fondo.topeCentavos),
    cuentaBancariaId: fondo.cuentaBancariaId,
    fechaDeCierre: fondo.fechaDeCierre,
    motivoDeCierre: fondo.motivoDeCierre,
    observaciones: fondo.observaciones,
    custodios: por.custodios.map(custodioDto),
    cambiosDeMonto: cambios.map(cambioDto),
    puedeAumentar: abierto,
    puedeDisminuir: abierto,
    puedeCambiarCustodio: abierto,
    puedeAnularApertura: abierto && soloLaApertura && por.sinUso,
  };
}
