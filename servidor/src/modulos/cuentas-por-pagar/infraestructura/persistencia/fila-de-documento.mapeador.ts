import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { numeroDeContrasena } from '../../dominio/contrasena.js';
import type { DatosDelLibro, FilaDeDocumento } from '../../aplicacion/puertos/puertos-de-consultas.js';
import type { ConsultaBaseDeDocumentos } from './consulta-base-de-documentos.js';
import { mapeadorDeDocumento } from './documento.mapeador.js';
import { pagosVigentesDe } from './subconsultas-de-pagos.js';

/** Nombres y apellidos juntos; `null` si el usuario no se pudo leer. */
const nombreCompleto = (nombres: string | null, apellidos: string | null): string | null =>
  nombres ? `${nombres} ${apellidos ?? ''}`.trim() : null;

type FilaSeleccionada = Awaited<ReturnType<ReturnType<ConsultaBaseDeDocumentos['seleccionar']>['limit']>>[number];

function datosDelLibroDe(fila: FilaSeleccionada): DatosDelLibro {
  return {
    proveedorNombre: fila.proveedorNombre,
    proveedorNit: fila.proveedorNit,
    fechaRecepcion: fila.fechaRecepcion,
    periodo: fila.periodo,
    anulacion: {
      causa: fila.causaDeAnulacion,
      motivo: fila.motivoDeAnulacion,
      anuladoPor: fila.anuladoPorEnElLibro,
      anuladoPorNombre: nombreCompleto(fila.anuladoPorNombres, fila.anuladoPorApellidos),
      anuladoEn: fila.anuladoEnElLibro,
    },
  };
}

function contrasenaDe(fila: FilaSeleccionada): FilaDeDocumento['contrasena'] {
  if (fila.contrasenaId === null || fila.contrasenaNumero === null) return null;
  return { id: fila.contrasenaId, numero: numeroDeContrasena(fila.contrasenaNumero, fila.contrasenaAnio ?? 0) };
}

/** Lo que las notas, los pagos, los ajustes y los reintegros rebajaron, y cuántos ajustes y reintegros vigentes hay. */
function rebajasDe(fila: FilaSeleccionada) {
  return {
    aplicadoAlCargoCentavos: aCentavos(fila.alCargo ?? '0'),
    aplicadoPorLaNotaCentavos: aCentavos(fila.porLaNota ?? '0'),
    ajustadoCentavos: aCentavos(fila.ajustado ?? '0'),
    ajustesVigentes: fila.ajustesVigentes ?? 0,
    pagosVigentes: pagosVigentesDe(fila.pagos),
    reintegradoCentavos: aCentavos(fila.reintegrado ?? '0'),
    reintegrosVigentes: fila.reintegrosVigentes ?? 0,
  };
}

/** De la fila de SQL al documento con sus cuentas, en centavos. */
export function aFilaDeDocumento(fila: FilaSeleccionada): FilaDeDocumento {
  return {
    documento: mapeadorDeDocumento.aDominio(fila.documento),
    libro: datosDelLibroDe(fila),
    creadoEn: fila.documento.creadoEn.toISOString(),
    ...rebajasDe(fila),
    aplicacionesManualesRecibidas: fila.manuales ?? 0,
    notasVigentes: fila.notasVigentes ?? 0,
    notasEnTotal: fila.notasEnTotal ?? 0,
    contrasena: contrasenaDe(fila),
  };
}
