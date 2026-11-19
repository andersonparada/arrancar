import { numeroONulo, numeroRequerido, textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { Clase } from '../../servicios/clases.api';
import type { DatosDeSaldoInicial, SaldoInicial } from '../../servicios/saldos-iniciales.api';

type Inciso = Clase['incisoFiscal'] | null;

/** Lo que muestra cada campo del formulario del saldo inicial; los montos son texto hasta enviarse. */
export interface EdicionDeSaldoInicial {
  codigo: string;
  descripcion: string;
  claseId: string | null;
  activoPadreId: string | null;
  fechaDeAdquisicion: string;
  fechaDeInicioDeUso: string;
  enConstruccion: boolean;
  cantidad: string | number;
  costo: string;
  depreciacionAcumuladaContable: string;
  costoFiscal: string;
  baseFiscal: string;
  depreciacionAcumuladaFiscal: string;
  porcentajeFiscal: string;
  vidaUtilRestanteMeses: string | number;
  valorResidual: string;
  valorComoGanadoComun: string;
  valorDeMatricula: string;
  valorCatastral: string;
  valoresDelInmuebleCompleto: boolean;
  marca: string;
  modelo: string;
  numeroDeSerie: string;
  placa: string;
  observaciones: string;
  localidadId: string | null;
  departamentoId: string | null;
  responsable: string;
  enBodega: boolean;
}

/** El formulario vacío: la depreciación acumulada empieza en cero (lo más común en un activo recién comprado). */
const VACIA: EdicionDeSaldoInicial = {
  codigo: '',
  descripcion: '',
  claseId: null,
  activoPadreId: null,
  fechaDeAdquisicion: '',
  fechaDeInicioDeUso: '',
  enConstruccion: false,
  cantidad: 1,
  costo: '',
  depreciacionAcumuladaContable: '0.00',
  costoFiscal: '',
  baseFiscal: '',
  depreciacionAcumuladaFiscal: '0.00',
  porcentajeFiscal: '',
  vidaUtilRestanteMeses: '',
  valorResidual: '',
  valorComoGanadoComun: '',
  valorDeMatricula: '',
  valorCatastral: '',
  valoresDelInmuebleCompleto: false,
  marca: '',
  modelo: '',
  numeroDeSerie: '',
  placa: '',
  observaciones: '',
  localidadId: null,
  departamentoId: null,
  responsable: '',
  enBodega: false,
};

export const edicionDeSaldoNueva = (): EdicionDeSaldoInicial => ({ ...VACIA });

/** Lo del activo y sus fechas, ya como texto de formulario. */
function camposDelActivo(saldo: SaldoInicial) {
  return {
    codigo: saldo.codigo,
    descripcion: saldo.descripcion,
    claseId: saldo.claseId,
    activoPadreId: saldo.activoPadreId,
    fechaDeAdquisicion: saldo.fechaDeAdquisicion,
    fechaDeInicioDeUso: textoDeEdicion(saldo.fechaDeInicioDeUso),
    enConstruccion: saldo.enConstruccion,
    cantidad: saldo.cantidad,
    localidadId: saldo.localidadId,
    departamentoId: saldo.departamentoId,
    responsable: textoDeEdicion(saldo.responsable),
    enBodega: saldo.enBodega,
  };
}

/** Los montos de los dos libros, ya como texto de formulario. */
function camposDeLosMontos(saldo: SaldoInicial) {
  return {
    costo: saldo.costo,
    depreciacionAcumuladaContable: saldo.depreciacionAcumuladaContable,
    costoFiscal: saldo.costoFiscal,
    baseFiscal: saldo.baseFiscal,
    depreciacionAcumuladaFiscal: saldo.depreciacionAcumuladaFiscal,
    porcentajeFiscal: textoDeEdicion(saldo.porcentajeFiscal),
    vidaUtilRestanteMeses: textoDeEdicion(saldo.vidaUtilRestanteMeses),
    valorResidual: textoDeEdicion(saldo.valorResidual),
  };
}

/** Los datos de identificación y del inmueble, ya como texto de formulario. */
function camposDeIdentificacion(saldo: SaldoInicial) {
  return {
    valorComoGanadoComun: textoDeEdicion(saldo.valorComoGanadoComun),
    valorDeMatricula: textoDeEdicion(saldo.valorDeMatricula),
    valorCatastral: textoDeEdicion(saldo.valorCatastral),
    valoresDelInmuebleCompleto: saldo.valoresDelInmuebleCompleto,
    marca: textoDeEdicion(saldo.marca),
    modelo: textoDeEdicion(saldo.modelo),
    numeroDeSerie: textoDeEdicion(saldo.numeroDeSerie),
    placa: textoDeEdicion(saldo.placa),
    observaciones: textoDeEdicion(saldo.observaciones),
  };
}

/** El formulario con lo ya cargado, para corregirlo. */
export const edicionDeSaldo = (saldo: SaldoInicial): EdicionDeSaldoInicial => ({
  ...VACIA,
  ...camposDelActivo(saldo),
  ...camposDeLosMontos(saldo),
  ...camposDeIdentificacion(saldo),
});

/** Una obra sin terminar y un terreno no se deprecian: el formulario no pide su depreciación acumulada. */
export const sinDepreciacion = (edicion: Pick<EdicionDeSaldoInicial, 'enConstruccion'>, inciso: Inciso): boolean =>
  edicion.enConstruccion || inciso === 'terrenos';

/** El valor en libros que va quedando mientras se escribe (costo menos depreciación acumulada contable). */
export function valorEnLibrosEscrito(edicion: Pick<EdicionDeSaldoInicial, 'costo' | 'depreciacionAcumuladaContable'>) {
  const costo = numeroONulo(edicion.costo);
  const acumulada = numeroONulo(edicion.depreciacionAcumuladaContable);
  if (costo === null || acumulada === null || Number.isNaN(costo) || Number.isNaN(acumulada)) return null;
  return (Math.round(costo * 100) - Math.round(acumulada * 100)) / 100;
}

const esMontoValido = (valor: string): boolean => valor.trim() !== '' && Number(valor) >= 0;

/** Lo que falta o está mal, por campo, con cómo corregirlo; el servidor revisa las reglas de fondo. */
export function erroresDeSaldo(edicion: EdicionDeSaldoInicial, inciso: Inciso): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!edicion.descripcion.trim()) errores.descripcion = 'Escriba qué es el activo.';
  if (!edicion.claseId) errores.claseId = 'Elija la clase del activo.';
  if (!edicion.fechaDeAdquisicion) errores.fechaDeAdquisicion = 'Escriba la fecha en que se compró.';
  if (!esMontoValido(edicion.costo)) errores.costo = 'Escriba el costo del activo (0 o más).';
  if (sinDepreciacion(edicion, inciso)) return errores;
  const contable = edicion.depreciacionAcumuladaContable;
  if (!esMontoValido(contable)) errores.depreciacionAcumuladaContable = 'Escriba lo depreciado al corte (0 si nada).';
  if (!esMontoValido(edicion.depreciacionAcumuladaFiscal))
    errores.depreciacionAcumuladaFiscal = 'Escriba lo depreciado en el libro fiscal (0 si nada).';
  return errores;
}

/** Matrícula y catastro solo en edificios; el valor como ganado común, solo en reproductores. */
function datosDelInciso(edicion: EdicionDeSaldoInicial, inciso: Inciso) {
  const conInmueble = inciso === 'edificios';
  return {
    valorComoGanadoComun: inciso === 'reproductores' ? textoONulo(edicion.valorComoGanadoComun) : null,
    valorDeMatricula: conInmueble ? textoONulo(edicion.valorDeMatricula) : null,
    valorCatastral: conInmueble ? textoONulo(edicion.valorCatastral) : null,
    valoresDelInmuebleCompleto: conInmueble && edicion.valoresDelInmuebleCompleto,
  };
}

function datosDelBien(edicion: EdicionDeSaldoInicial) {
  return {
    marca: textoONulo(edicion.marca),
    modelo: textoONulo(edicion.modelo),
    numeroDeSerie: textoONulo(edicion.numeroDeSerie),
    placa: textoONulo(edicion.placa),
    observaciones: textoONulo(edicion.observaciones),
    localidadId: edicion.localidadId,
    departamentoId: edicion.departamentoId,
    responsable: textoONulo(edicion.responsable),
    enBodega: edicion.enBodega,
  };
}

/** Lo que se manda al servidor: lo vacío como `null` (el servidor propone lo que falta) y sin lo que no aplica. */
export function datosDeSaldo(edicion: EdicionDeSaldoInicial, inciso: Inciso): DatosDeSaldoInicial {
  const sinAcumular = sinDepreciacion(edicion, inciso);
  return {
    codigo: textoONulo(edicion.codigo),
    descripcion: edicion.descripcion.trim(),
    claseId: edicion.claseId ?? '',
    activoPadreId: edicion.activoPadreId,
    fechaDeAdquisicion: edicion.fechaDeAdquisicion,
    fechaDeInicioDeUso: edicion.enConstruccion ? null : textoONulo(edicion.fechaDeInicioDeUso),
    enConstruccion: edicion.enConstruccion,
    cantidad: numeroRequerido(edicion.cantidad),
    costo: edicion.costo,
    depreciacionAcumuladaContable: sinAcumular ? '0.00' : edicion.depreciacionAcumuladaContable,
    depreciacionAcumuladaFiscal: sinAcumular ? '0.00' : edicion.depreciacionAcumuladaFiscal,
    costoFiscal: textoONulo(edicion.costoFiscal),
    baseFiscal: textoONulo(edicion.baseFiscal),
    porcentajeFiscal: textoONulo(edicion.porcentajeFiscal),
    vidaUtilRestanteMeses: numeroONulo(edicion.vidaUtilRestanteMeses),
    valorResidual: textoONulo(edicion.valorResidual),
    ...datosDelInciso(edicion, inciso),
    ...datosDelBien(edicion),
  };
}
