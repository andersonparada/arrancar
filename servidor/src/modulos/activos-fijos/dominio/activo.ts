import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { ActivoDadoDeBaja, ActivoInvalido, ActivoNoEnUso, MotivoDeOcioRequerido } from './errores-de-activo.js';
import type { IncisoFiscal } from './incisos-fiscales.js';
import { datosDeActivoValidos, textoOpcional, type DatosDeActivo } from './reglas-de-activo.js';
import type { EstadoDeActivo } from './tipos-de-activo.js';

export { ActivoInvalido };
export type ActivoId = Identificador<'Activo'>;

/** Dónde está el activo hoy; la primera fila del historial de traslados (el alta) nace con esto. */
export interface UbicacionDeActivo {
  localidadId: string | null;
  departamentoId: string | null;
  responsable: string | null;
  /** Guardado en la bodega de activos: listo, sin entregar (AFI). */
  enBodega: boolean;
}

/** Lo que el ciclo de vida del activo va llenando; el alta manual solo deja lo primero. */
export interface VidaDeActivo {
  estado: EstadoDeActivo;
  ocioso: boolean;
  ociosoDesde: string | null;
  motivoDeOcio: string | null;
  fechaDeInicioDeUso: string | null;
  fechaDeBaja: string | null;
  porcentajeFiscal: string | null;
  vidaUtilContableMeses: number | null;
  valorResidual: string | null;
  altaConjuntaId: string | null;
  responsableUsuarioId: string | null;
  fotoArchivoId: string | null;
}

export interface PropiedadesDeActivo extends DatosDeActivo, UbicacionDeActivo, VidaDeActivo {
  id: ActivoId;
  empresaId: Identificador<'Empresa'>;
}

/** Los datos del alta manual: lo escrito y la ubicación inicial. */
export interface EntradaDeAlta {
  datos: DatosDeActivo;
  ubicacion: UbicacionDeActivo;
}

/** Lo que se puede cambiar al editar: el código y el tipo de registro no se cambian. */
export type DatosEditables = Omit<DatosDeActivo, 'codigo' | 'tipoDeRegistro'>;

/** Se cambian solo mientras el activo está en construcción. */
const SOLO_EN_CONSTRUCCION: readonly (keyof DatosEditables)[] = [
  'claseId',
  'activoPadreId',
  'cantidad',
  'origen',
  'fechaDeAdquisicion',
];
/** Mueven la base fiscal: con libros abiertos solo se cambian con la revisión de la estimación (AF-4). */
const SOLO_SIN_LIBROS: readonly (keyof DatosEditables)[] = [
  'valorDeMatricula',
  'valorCatastral',
  'valoresDelInmuebleCompleto',
  'valorComoGanadoComun',
];

const MOTIVO_MAXIMO = 300;

/** Dos montos como «1000» y «1000.00» son el mismo valor. */
function mismoValor(nuevo: unknown, actual: unknown): boolean {
  if (nuevo === actual) return true;
  return typeof nuevo === 'string' && typeof actual === 'string' && Number(nuevo) === Number(actual);
}

/** Activo de la empresa. Sus reglas van aquí, en el dominio. */
export class Activo extends Entidad<ActivoId> {
  private constructor(private propiedades: PropiedadesDeActivo) {
    super(propiedades.id);
  }

  /**
   * Un activo del balance nace en construcción (se pone en uso después, AF-4); un bien de control o de terceros
   * nace en uso, sin libros, con la fecha de su adquisición.
   * @throws ActivoInvalido u otro error de datos si no cumple las reglas.
   */
  static crear(empresaId: Identificador<'Empresa'>, { datos, ubicacion }: EntradaDeAlta, inciso: IncisoFiscal): Activo {
    const validos = datosDeActivoValidos(datos, inciso);
    const enConstruccion = validos.tipoDeRegistro === 'activo';
    return new Activo({
      ...validos,
      ...ubicacion,
      responsable: textoOpcional(ubicacion.responsable, 'Responsable', 150),
      id: Identificador.nuevo(),
      empresaId,
      estado: enConstruccion ? 'en_construccion' : 'en_uso',
      ocioso: false,
      ociosoDesde: null,
      motivoDeOcio: null,
      fechaDeInicioDeUso: enConstruccion ? null : validos.fechaDeAdquisicion,
      fechaDeBaja: null,
      porcentajeFiscal: null,
      vidaUtilContableMeses: null,
      valorResidual: null,
      altaConjuntaId: null,
      responsableUsuarioId: null,
      fotoArchivoId: null,
    });
  }

  static reconstruir(propiedades: PropiedadesDeActivo): Activo {
    return new Activo(propiedades);
  }

  /**
   * Cambia los datos descriptivos. La clase, el padre, la cantidad, el origen y la fecha de adquisición solo se
   * cambian en construcción; la matrícula y el catastro, mientras no haya libros.
   * @throws ActivoDadoDeBaja si ya se dio de baja.
   * @throws ActivoInvalido si cambia algo que ya no se puede cambiar o no cumple las reglas.
   */
  cambiarDatos(datos: DatosEditables, inciso: IncisoFiscal): void {
    if (this.propiedades.estado === 'dado_de_baja') throw new ActivoDadoDeBaja();
    this.exigirSinCambios(datos, SOLO_EN_CONSTRUCCION, this.propiedades.estado !== 'en_construccion');
    this.exigirSinCambios(datos, SOLO_SIN_LIBROS, this.propiedades.porcentajeFiscal !== null);
    const { codigo, tipoDeRegistro } = this.propiedades;
    this.propiedades = { ...this.propiedades, ...datosDeActivoValidos({ ...datos, codigo, tipoDeRegistro }, inciso) };
  }

  /**
   * Un activo ocioso sigue depreciándose; solo se deja constancia de cuándo y por qué (NIIF 17.20).
   * @throws ActivoNoEnUso, MotivoDeOcioRequerido, ActivoInvalido si la fecha es futura o anterior al uso.
   */
  marcarOcioso({ fecha, motivo }: { fecha: string; motivo: string }, hoy: string): void {
    this.exigirEnUso();
    const limpio = motivo.trim();
    if (!limpio) throw new MotivoDeOcioRequerido();
    if (limpio.length > MOTIVO_MAXIMO)
      throw new ActivoInvalido(`El motivo no puede pasar de ${MOTIVO_MAXIMO} caracteres.`);
    this.exigirFechaDeOcio(fecha, hoy);
    this.propiedades = { ...this.propiedades, ocioso: true, ociosoDesde: fecha, motivoDeOcio: limpio };
  }

  /** @throws ActivoNoEnUso, ActivoInvalido si la fecha es futura o anterior a cuando se marcó. */
  quitarOcioso(fecha: string, hoy: string): void {
    this.exigirEnUso();
    this.exigirFechaDeOcio(fecha, hoy);
    if (this.propiedades.ociosoDesde && fecha < this.propiedades.ociosoDesde)
      throw new ActivoInvalido('La fecha no puede ser anterior a la de la marca de ocioso.');
    this.propiedades = { ...this.propiedades, ocioso: false, ociosoDesde: null, motivoDeOcio: null };
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeActivo> {
    return { ...this.propiedades };
  }

  private exigirEnUso(): void {
    if (this.propiedades.estado !== 'en_uso') throw new ActivoNoEnUso();
  }

  private exigirFechaDeOcio(fecha: string, hoy: string): void {
    const uso = this.propiedades.fechaDeInicioDeUso;
    if (fecha > hoy) throw new ActivoInvalido('La fecha no puede ser futura.');
    if (uso && fecha < uso) throw new ActivoInvalido('La fecha no puede ser anterior al inicio de uso.');
  }

  private exigirSinCambios(datos: DatosEditables, claves: readonly (keyof DatosEditables)[], bloqueado: boolean): void {
    const cambiadas = claves.filter((clave) => !mismoValor(datos[clave], this.propiedades[clave]));
    if (bloqueado && cambiadas.length > 0)
      throw new ActivoInvalido('Ese dato ya no se puede cambiar en este activo (ver la ficha para su acción propia).');
  }
}
