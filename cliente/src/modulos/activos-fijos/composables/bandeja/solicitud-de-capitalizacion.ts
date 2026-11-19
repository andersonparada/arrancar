import { textoONulo, numeroRequerido } from '@/modulos/core/utilidades/edicion';
import type { Activo } from '../../servicios/activos.api';
import type { ActivoNuevoDeAsignacion, AsignacionDeLinea, LineaDeBandeja } from '../../servicios/bandeja.api';
import type { Clase } from '../../servicios/clases.api';
import { detalleParaEnviar } from './cuadricula-de-unidades';
import type { EdicionDeActivoNuevo, EdicionDeAsignacion } from './edicion-de-capitalizacion';
import { esNotaDelLibro, restaDelCosto } from './lineas-de-bandeja';
import { centavosDeTexto, textoDeCentavos } from './montos-de-bandeja';

/** Con qué se arma la solicitud: las líneas, las clases y los activos que ya existen. */
export interface ContextoDeSolicitud {
  lineas: readonly LineaDeBandeja[];
  clases: readonly Clase[];
  activos: readonly Activo[];
}

/** Matrícula y catastro solo en edificios; valor como ganado común, solo en reproductores. */
function datosFiscales(nuevo: EdicionDeActivoNuevo, inciso: Clase['incisoFiscal'] | undefined) {
  const conInmueble = inciso === 'edificios';
  return {
    valorComoGanadoComun: inciso === 'reproductores' ? textoONulo(nuevo.valorComoGanadoComun) : null,
    valorDeMatricula: conInmueble ? textoONulo(nuevo.valorDeMatricula) : null,
    valorCatastral: conInmueble ? textoONulo(nuevo.valorCatastral) : null,
    valoresDelInmuebleCompleto: conInmueble && nuevo.valoresDelInmuebleCompleto,
  };
}

function activoNuevoParaEnviar(nuevo: EdicionDeActivoNuevo, inciso: Clase['incisoFiscal'] | undefined) {
  const resultado: ActivoNuevoDeAsignacion = {
    descripcion: nuevo.descripcion.trim(),
    claseId: nuevo.claseId ?? '',
    tipoDeRegistro: nuevo.tipoDeRegistro,
    origen: 'compra',
    activoPadreId: null,
    localidadId: nuevo.localidadId,
    departamentoId: nuevo.departamentoId,
    responsable: textoONulo(nuevo.responsable),
    enBodega: nuevo.enBodega,
    marca: textoONulo(nuevo.marca),
    modelo: textoONulo(nuevo.modelo),
    observaciones: textoONulo(nuevo.observaciones),
    unidades: numeroRequerido(nuevo.unidades),
    cantidadPorActivo: numeroRequerido(nuevo.cantidadPorActivo),
    detalleDeUnidades: detalleParaEnviar(nuevo.renglones),
    ...datosFiscales(nuevo, inciso),
  };
  return resultado;
}

/** El inciso de lo que recibe la parte: la clase del activo nuevo o la del activo que ya existe. */
export function incisoDeLaParte(
  parte: EdicionDeAsignacion,
  contexto: ContextoDeSolicitud,
): Clase['incisoFiscal'] | undefined {
  if (parte.destino === 'nuevo') return contexto.clases.find((clase) => clase.id === parte.nuevo.claseId)?.incisoFiscal;
  if (parte.destino === 'existente')
    return contexto.activos.find((activo) => activo.id === parte.activoId)?.incisoFiscal;
  return undefined;
}

/** El monto lleva el signo de la línea: las notas de crédito restan. */
function montoFirmado(parte: EdicionDeAsignacion, linea: LineaDeBandeja | undefined): string {
  const centavos = Math.abs(centavosDeTexto(parte.monto) ?? 0);
  return textoDeCentavos(linea && restaDelCosto(linea) ? -centavos : centavos);
}

function asignacionParaEnviar(parte: EdicionDeAsignacion, contexto: ContextoDeSolicitud): AsignacionDeLinea {
  const linea = contexto.lineas.find((candidata) => candidata.lineaId === parte.lineaId);
  const inciso = incisoDeLaParte(parte, contexto);
  const esNota = linea ? esNotaDelLibro(linea) : false;
  return {
    lineaId: parte.lineaId,
    monto: montoFirmado(parte, linea),
    activoId: parte.destino === 'existente' ? parte.activoId : null,
    activoNuevo: parte.destino === 'nuevo' ? activoNuevoParaEnviar(parte.nuevo, inciso) : null,
    altaConjuntaId: parte.destino === 'conjunta' ? parte.altaConjuntaId : null,
    claseDeCosto: parte.destino === 'nuevo' || esNota ? null : parte.claseDeCosto,
    noEsEdificacion: inciso === 'edificios' && parte.noEsEdificacion,
  };
}

/** Lo que se manda al servidor: cada parte con su monto firmado y solo el destino elegido. */
export function solicitudDeCapitalizacion(
  partes: readonly EdicionDeAsignacion[],
  contexto: ContextoDeSolicitud,
): AsignacionDeLinea[] {
  return partes.map((parte) => asignacionParaEnviar(parte, contexto));
}
