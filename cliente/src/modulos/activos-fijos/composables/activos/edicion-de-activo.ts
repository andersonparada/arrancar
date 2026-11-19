import { numeroRequerido, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { Clase } from '../../servicios/clases.api';
import type { DatosActivo, FormaDeTenencia, OrigenDeActivo, TipoDeRegistro } from '../../servicios/activos.api';

export const OPCIONES_DE_TIPO: Record<TipoDeRegistro, string> = {
  activo: 'Activo fijo (del balance)',
  bien_de_control: 'Bien de control (se fue a gasto)',
  de_terceros: 'Bien de terceros',
};

export const OPCIONES_DE_ORIGEN: Record<OrigenDeActivo, string> = {
  compra: 'Compra',
  construccion: 'Construcción propia',
  importacion: 'Importación',
  aporte: 'Aporte',
  donacion: 'Donación',
  saldo_inicial: 'Saldo inicial',
  otro: 'Otro',
};

export const OPCIONES_DE_TENENCIA: Record<FormaDeTenencia, string> = {
  arrendamiento: 'Arrendamiento',
  comodato: 'Comodato',
  otra: 'Otra',
};

/** Lo que muestra cada campo del formulario mientras se da de alta un activo. */
export interface EdicionDeActivo {
  codigo: string;
  descripcion: string;
  tipoDeRegistro: TipoDeRegistro;
  claseId: string | null;
  activoPadreId: string | null;
  origen: OrigenDeActivo | null;
  propietario: string;
  formaDeTenencia: FormaDeTenencia | null;
  fechaDeAdquisicion: string;
  cantidad: string | number;
  marca: string;
  modelo: string;
  numeroDeSerie: string;
  placa: string;
  observaciones: string;
  valorComoGanadoComun: string;
  valorDeMatricula: string;
  valorCatastral: string;
  valoresDelInmuebleCompleto: boolean;
  localidadId: string | null;
  departamentoId: string | null;
  responsable: string;
  enBodega: boolean;
}

/** El formulario vacío; `hoy` (`AAAA-MM-DD`) es la fecha de adquisición que se propone. */
export const edicionNueva = (hoy: string): EdicionDeActivo => ({
  codigo: '',
  descripcion: '',
  tipoDeRegistro: 'activo',
  claseId: null,
  activoPadreId: null,
  origen: 'compra',
  propietario: '',
  formaDeTenencia: null,
  fechaDeAdquisicion: hoy,
  cantidad: 1,
  marca: '',
  modelo: '',
  numeroDeSerie: '',
  placa: '',
  observaciones: '',
  valorComoGanadoComun: '',
  valorDeMatricula: '',
  valorCatastral: '',
  valoresDelInmuebleCompleto: false,
  localidadId: null,
  departamentoId: null,
  responsable: '',
  enBodega: false,
});

export const esDeTerceros = (edicion: Pick<EdicionDeActivo, 'tipoDeRegistro'>): boolean =>
  edicion.tipoDeRegistro === 'de_terceros';

/** Los datos del inmueble solo se piden en edificios; el valor como ganado común, en reproductores. */
export const incisoDe = (clases: readonly Clase[], claseId: string | null): Clase['incisoFiscal'] | null =>
  clases.find((clase) => clase.id === claseId)?.incisoFiscal ?? null;

/** Al cambiar el tipo se limpian los datos que ya no aplican, para no mandar lo que el servidor rechaza. */
export function alCambiarElTipo(edicion: EdicionDeActivo): void {
  if (esDeTerceros(edicion)) {
    edicion.origen = null;
    edicion.formaDeTenencia ??= 'comodato';
    return;
  }
  edicion.origen ??= 'compra';
  edicion.propietario = '';
  edicion.formaDeTenencia = null;
}

/** Un departamento de otra localidad no sirve: si cambia la localidad, se deja el que sea de toda la empresa o de ella. */
export function departamentoValido(
  departamentos: readonly { id: string; localidadId: string | null }[],
  { localidadId, departamentoId }: Pick<EdicionDeActivo, 'localidadId' | 'departamentoId'>,
): string | null {
  const elegido = departamentos.find((departamento) => departamento.id === departamentoId);
  if (!elegido) return null;
  return elegido.localidadId === null || elegido.localidadId === localidadId ? elegido.id : null;
}

type Inciso = Clase['incisoFiscal'] | null;

/** El origen, o el propietario y la forma de tenencia si es de terceros: nunca los dos. */
function datosDeProcedencia(edicion: EdicionDeActivo) {
  const deTerceros = esDeTerceros(edicion);
  return {
    origen: deTerceros ? null : edicion.origen,
    propietario: deTerceros ? textoONulo(edicion.propietario) : null,
    formaDeTenencia: deTerceros ? edicion.formaDeTenencia : null,
  };
}

/** Matrícula y catastro solo en edificios; valor como ganado común, solo en reproductores. */
function datosFiscales(edicion: EdicionDeActivo, inciso: Inciso) {
  const conInmueble = inciso === 'edificios';
  return {
    valorComoGanadoComun: inciso === 'reproductores' ? textoONulo(edicion.valorComoGanadoComun) : null,
    valorDeMatricula: conInmueble ? textoONulo(edicion.valorDeMatricula) : null,
    valorCatastral: conInmueble ? textoONulo(edicion.valorCatastral) : null,
    valoresDelInmuebleCompleto: conInmueble && edicion.valoresDelInmuebleCompleto,
  };
}

/** Lo que se manda al servidor: lo vacío como `null`, y los datos que no son del inciso, también. */
export function datosDeActivo(edicion: EdicionDeActivo, inciso: Inciso): DatosActivo {
  return {
    codigo: textoONulo(edicion.codigo),
    descripcion: edicion.descripcion,
    claseId: edicion.claseId ?? '',
    activoPadreId: edicion.activoPadreId,
    tipoDeRegistro: edicion.tipoDeRegistro,
    fechaDeAdquisicion: edicion.fechaDeAdquisicion,
    marca: textoONulo(edicion.marca),
    modelo: textoONulo(edicion.modelo),
    numeroDeSerie: textoONulo(edicion.numeroDeSerie),
    placa: textoONulo(edicion.placa),
    cantidad: numeroRequerido(edicion.cantidad),
    observaciones: textoONulo(edicion.observaciones),
    localidadId: edicion.localidadId,
    departamentoId: edicion.departamentoId,
    responsable: textoONulo(edicion.responsable),
    enBodega: edicion.enBodega,
    ...datosDeProcedencia(edicion),
    ...datosFiscales(edicion, inciso),
  };
}
