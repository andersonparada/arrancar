import type { ClaseDeCostoElegible } from '../../servicios/costos.api';
import type { LineaDeBandeja } from '../../servicios/bandeja.api';
import { centavosDeTexto, textoDeCentavos } from './montos-de-bandeja';
import { ajustarCuadricula, type RenglonDeUnidad } from './cuadricula-de-unidades';

export type DestinoDeAsignacion = 'nuevo' | 'existente' | 'conjunta';

export const OPCIONES_DE_DESTINO: Record<DestinoDeAsignacion, string> = {
  nuevo: 'Activo nuevo',
  existente: 'Activo que ya existe',
  conjunta: 'Compra conjunta (varios activos iguales)',
};

/** Las clases de costo que se eligen a mano al sumar una línea a un activo que ya existe. */
export const OPCIONES_DE_CLASE_DE_COSTO: Record<ClaseDeCostoElegible, string> = {
  adquisicion: 'Adquisición',
  importacion: 'Importación',
  flete: 'Flete',
  instalacion: 'Instalación',
  construccion: 'Construcción',
  honorarios: 'Honorarios',
  desmantelamiento: 'Desmantelamiento',
  otro: 'Otro',
};

/** Lo que se escribe del activo (o los activos iguales) que nace de una asignación. */
export interface EdicionDeActivoNuevo {
  descripcion: string;
  claseId: string | null;
  tipoDeRegistro: 'activo' | 'bien_de_control';
  localidadId: string | null;
  departamentoId: string | null;
  responsable: string;
  enBodega: boolean;
  marca: string;
  modelo: string;
  observaciones: string;
  valorComoGanadoComun: string | number;
  valorDeMatricula: string | number;
  valorCatastral: string | number;
  valoresDelInmuebleCompleto: boolean;
  unidades: string | number;
  cantidadPorActivo: string | number;
  renglones: RenglonDeUnidad[];
}

/** Una parte de una línea: cuánto de su costo y adónde va. El monto se escribe sin signo; el de una nota resta solo. */
export interface EdicionDeAsignacion {
  /** Identifica la parte mientras se edita (una línea puede repartirse en varias). */
  clave: number;
  lineaId: string;
  /** Lo que se escribe; el campo numérico lo entrega como número. */
  monto: string | number;
  destino: DestinoDeAsignacion;
  activoId: string | null;
  altaConjuntaId: string | null;
  claseDeCosto: ClaseDeCostoElegible;
  noEsEdificacion: boolean;
  nuevo: EdicionDeActivoNuevo;
}

const LARGO_DE_DESCRIPCION = 200;

/** Lo que se propone de un activo nuevo a partir de su línea: su descripción, su clase y su tipo según el umbral. */
export function activoNuevoDeLinea(linea: LineaDeBandeja): EdicionDeActivoNuevo {
  return {
    descripcion: (linea.descripcion?.trim() || linea.conceptoNombre).slice(0, LARGO_DE_DESCRIPCION),
    claseId: linea.claseSugeridaId,
    tipoDeRegistro: linea.bajoElUmbral ? 'bien_de_control' : 'activo',
    localidadId: null,
    departamentoId: null,
    responsable: '',
    enBodega: false,
    marca: '',
    modelo: '',
    observaciones: '',
    valorComoGanadoComun: '',
    valorDeMatricula: '',
    valorCatastral: '',
    valoresDelInmuebleCompleto: false,
    unidades: 1,
    cantidadPorActivo: 1,
    renglones: ajustarCuadricula([], 1),
  };
}

/** El monto de la línea sin signo, como se escribe en el campo. */
export const montoSinSigno = (monto: string): string => textoDeCentavos(Math.abs(centavosDeTexto(monto) ?? 0));

/**
 * La primera parte de una línea: todo el pendiente a un activo nuevo, o al activo que el servidor propone (en una
 * nota de crédito, el de más costo de su factura).
 */
export function asignacionInicial(linea: LineaDeBandeja, clave: number): EdicionDeAsignacion {
  const sugerido = linea.activoSugeridoId;
  return {
    clave,
    lineaId: linea.lineaId,
    monto: montoSinSigno(linea.pendiente),
    destino: sugerido ? 'existente' : 'nuevo',
    activoId: sugerido,
    altaConjuntaId: null,
    claseDeCosto: 'adquisicion',
    noEsEdificacion: false,
    nuevo: activoNuevoDeLinea(linea),
  };
}

/** Otra parte de la misma línea, sin monto: lo que falta lo escribe el operador. */
export function asignacionAdicional(linea: LineaDeBandeja, clave: number, sinRepartir: string): EdicionDeAsignacion {
  return { ...asignacionInicial(linea, clave), monto: sinRepartir, destino: 'nuevo', activoId: null };
}

/** Cuánto de la línea falta por repartir entre sus partes (sin signo); nunca menos de cero. */
export function sinRepartirDeLaLinea(linea: LineaDeBandeja, partes: readonly EdicionDeAsignacion[]): string {
  const pendiente = Math.abs(centavosDeTexto(linea.pendiente) ?? 0);
  const repartido = partes.reduce((suma, parte) => suma + (centavosDeTexto(parte.monto) ?? 0), 0);
  return textoDeCentavos(Math.max(0, pendiente - repartido));
}

/** Cambiar las unidades acomoda la cuadrícula para que tenga un renglón por unidad. */
export function alCambiarLasUnidades(nuevo: EdicionDeActivoNuevo): void {
  const unidades = Number(nuevo.unidades);
  if (Number.isInteger(unidades) && unidades > 0) nuevo.renglones = ajustarCuadricula(nuevo.renglones, unidades);
}
