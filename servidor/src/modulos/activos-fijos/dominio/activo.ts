import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { ActivoDeTercerosSinCostos, CostoPosteriorNoDisponible } from './errores-de-costo.js';
import { ActivoNoEnConstruccion, ActivoSinLibros, FechaDeUsoInvalida } from './errores-de-depreciacion.js';
import { ActivoDadoDeBaja, ActivoInvalido, ActivoNoEnUso, MotivoDeOcioRequerido } from './errores-de-activo.js';
import type { IncisoFiscal } from './incisos-fiscales.js';
import { ActivoSinDepreciacionParaMejorar } from './errores-de-mejora.js';
import {
  datosDeActivoValidos,
  textoOpcional,
  valoresDelInmuebleValidos,
  type DatosDeActivo,
  type ValoresDelInmuebleDeActivo,
} from './reglas-de-activo.js';
import type { EstadoDeActivo } from './tipos-de-activo.js';
import { SIN_HISTORIA, SIN_USO } from './vida-inicial-de-activo.js';

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
  /** Los activos que se crean juntos desde una misma asignación de la bandeja comparten este id (AFI). */
  altaConjuntaId?: string | null;
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

/** Lo que se guarda al poner en uso: la fecha y los parámetros con que se depreciará (el residual, en monto). */
export interface DatosDeUso {
  fechaDeInicioDeUso: string;
  porcentajeFiscal: string;
  vidaUtilContableMeses: number | null;
  valorResidual: string;
}

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
  static crear(
    empresaId: Identificador<'Empresa'>,
    { datos, ubicacion, altaConjuntaId = null }: EntradaDeAlta,
    inciso: IncisoFiscal,
  ): Activo {
    const validos = datosDeActivoValidos(datos, inciso);
    const enConstruccion = validos.tipoDeRegistro === 'activo';
    return new Activo({
      ...validos,
      ...ubicacion,
      responsable: textoOpcional(ubicacion.responsable, 'Responsable', 150),
      id: Identificador.nuevo(),
      empresaId,
      estado: enConstruccion ? 'en_construccion' : 'en_uso',
      ...SIN_HISTORIA,
      fechaDeInicioDeUso: enConstruccion ? null : validos.fechaDeAdquisicion,
      altaConjuntaId,
    });
  }

  static reconstruir(propiedades: PropiedadesDeActivo): Activo {
    return new Activo(propiedades);
  }

  /**
   * Cambia los datos descriptivos. La clase, el padre, la cantidad, el origen y la fecha de adquisición solo se
   * cambian en construcción (y nunca en un saldo inicial, que se corrige en Saldos iniciales); la matrícula y el
   * catastro, mientras no haya libros.
   * @throws ActivoDadoDeBaja si ya se dio de baja.
   * @throws ActivoInvalido si cambia algo que ya no se puede cambiar o no cumple las reglas.
   */
  cambiarDatos(datos: DatosEditables, inciso: IncisoFiscal): void {
    if (this.propiedades.estado === 'dado_de_baja') throw new ActivoDadoDeBaja();
    const delSaldoInicial = this.propiedades.origen === 'saldo_inicial';
    this.exigirSinCambios(
      datos,
      SOLO_EN_CONSTRUCCION,
      this.propiedades.estado !== 'en_construccion' || delSaldoInicial,
    );
    this.exigirSinCambios(datos, SOLO_SIN_LIBROS, this.propiedades.porcentajeFiscal !== null);
    const { codigo, tipoDeRegistro } = this.propiedades;
    this.propiedades = { ...this.propiedades, ...datosDeActivoValidos({ ...datos, codigo, tipoDeRegistro }, inciso) };
  }

  /**
   * Un activo ocioso sigue depreciándose; solo se deja constancia de cuándo y por qué (NIIF 17.20).
   * @throws ActivoNoEnUso, MotivoDeOcioRequerido, ActivoInvalido si ya es ocioso o la fecha es futura o anterior al uso.
   */
  marcarOcioso({ fecha, motivo }: { fecha: string; motivo: string }, hoy: string): void {
    this.exigirEnUso();
    if (this.propiedades.ocioso) throw new ActivoInvalido('El activo ya está marcado como ocioso.');
    const limpio = motivo.trim();
    if (!limpio) throw new MotivoDeOcioRequerido();
    if (limpio.length > MOTIVO_MAXIMO)
      throw new ActivoInvalido(`El motivo no puede pasar de ${MOTIVO_MAXIMO} caracteres.`);
    this.exigirFechaDeOcio(fecha, hoy);
    this.propiedades = { ...this.propiedades, ocioso: true, ociosoDesde: fecha, motivoDeOcio: limpio };
  }

  /** @throws ActivoNoEnUso, ActivoInvalido si no es ocioso o la fecha es futura o anterior a cuando se marcó. */
  quitarOcioso(fecha: string, hoy: string): void {
    this.exigirEnUso();
    if (!this.propiedades.ocioso) throw new ActivoInvalido('El activo no está marcado como ocioso.');
    this.exigirFechaDeOcio(fecha, hoy);
    if (this.propiedades.ociosoDesde && fecha < this.propiedades.ociosoDesde)
      throw new ActivoInvalido('La fecha no puede ser anterior a la de la marca de ocioso.');
    this.propiedades = { ...this.propiedades, ocioso: false, ociosoDesde: null, motivoDeOcio: null };
  }

  /**
   * Deja la ubicación vigente (traslado o anulación de uno): el responsable escrito reemplaza al usuario responsable.
   * @throws ActivoDadoDeBaja si ya se dio de baja.
   */
  moverA(ubicacion: UbicacionDeActivo): void {
    if (this.propiedades.estado === 'dado_de_baja') throw new ActivoDadoDeBaja();
    this.propiedades = { ...this.propiedades, ...ubicacion, responsableUsuarioId: null };
  }

  /**
   * Pone el activo en uso (en la pantalla, «Disponible para uso»): guarda los parámetros con que se depreciará.
   * @throws ActivoNoEnConstruccion si no es un activo del balance en construcción.
   * @throws FechaDeUsoInvalida si la fecha es anterior a la de adquisición.
   */
  ponerEnUso(datos: DatosDeUso): void {
    this.exigirEnConstruccion();
    if (datos.fechaDeInicioDeUso < this.propiedades.fechaDeAdquisicion)
      throw new FechaDeUsoInvalida('La fecha de inicio de uso no puede ser anterior a la de adquisición.');
    this.propiedades = { ...this.propiedades, ...datos, estado: 'en_uso' };
  }

  /** @throws ActivoNoEnConstruccion si no es un activo del balance en construcción. */
  exigirEnConstruccion(): void {
    if (this.propiedades.tipoDeRegistro !== 'activo' || this.propiedades.estado !== 'en_construccion')
      throw new ActivoNoEnConstruccion();
  }

  /**
   * Da de baja el activo con la fecha dada (no se depreciará después de ella; §6.8).
   * @throws ActivoNoEnUso si no está en uso (un activo en construcción no se da de baja, se elimina o se pone en uso).
   */
  darDeBaja(fecha: string): void {
    this.exigirPuedeDarseDeBaja();
    this.propiedades = { ...this.propiedades, estado: 'dado_de_baja', fechaDeBaja: fecha };
  }

  /** @throws ActivoDadoDeBaja o ActivoNoEnUso si el activo no admite la baja; no cambia nada. */
  exigirPuedeDarseDeBaja(): void {
    if (this.propiedades.estado === 'dado_de_baja') throw new ActivoDadoDeBaja();
    this.exigirEnUso('Solo un activo en uso se da de baja o se vende.');
  }

  /** Deshace la baja (anularla): el activo vuelve a estar en uso. @throws ActivoInvalido si no está dado de baja. */
  deshacerBaja(): void {
    if (this.propiedades.estado !== 'dado_de_baja') throw new ActivoInvalido('El activo no está dado de baja.');
    this.propiedades = { ...this.propiedades, estado: 'en_uso', fechaDeBaja: null };
  }

  /**
   * Deshace «poner en uso»: vuelve a construcción y borra los parámetros de depreciación y la marca de ocioso.
   * @throws ActivoSinLibros si no es un activo del balance en uso.
   */
  quitarDeUso(): void {
    if (this.propiedades.tipoDeRegistro !== 'activo' || this.propiedades.estado !== 'en_uso')
      throw new ActivoSinLibros();
    this.propiedades = { ...this.propiedades, ...SIN_USO, estado: 'en_construccion' };
  }

  /**
   * Un costo se suma o se anula solo mientras el activo está en construcción (o es un bien de control, cuyos costos son
   * de referencia): uno en uso con libros recibe mejoras y costos posteriores (AF-7).
   * @throws ActivoDadoDeBaja, ActivoDeTercerosSinCostos o CostoPosteriorNoDisponible si no admite costos.
   */
  exigirAdmiteCostos(): void {
    const { estado, tipoDeRegistro } = this.propiedades;
    if (estado === 'dado_de_baja') throw new ActivoDadoDeBaja();
    if (tipoDeRegistro === 'de_terceros') throw new ActivoDeTercerosSinCostos();
    if (tipoDeRegistro === 'activo' && estado === 'en_uso') throw new CostoPosteriorNoDisponible();
  }

  /**
   * Solo un activo del balance en uso, con libros, recibe mejoras y costos posteriores (§6.6).
   * @throws ActivoDadoDeBaja o ActivoSinDepreciacionParaMejorar si no.
   */
  exigirAdmiteMejoras(): void {
    const { estado, tipoDeRegistro } = this.propiedades;
    if (estado === 'dado_de_baja') throw new ActivoDadoDeBaja();
    if (tipoDeRegistro !== 'activo' || estado !== 'en_uso') throw new ActivoSinDepreciacionParaMejorar();
  }

  /** Deja la vida útil contable total y el residual con que el activo se deprecia desde una mejora o una revisión. */
  ajustarEstimacion(estimacion: Pick<DatosDeUso, 'vidaUtilContableMeses' | 'valorResidual'>): void {
    this.propiedades = { ...this.propiedades, ...estimacion };
  }

  /**
   * Cambia la matrícula, el catastro y si son del inmueble completo (nuevo avalúo, rectificación; §3.5.1).
   * @throws ValorFiscalSoloEnEdificios o ActivoInvalido si no cumplen las reglas.
   */
  cambiarValoresDelInmueble(valores: ValoresDelInmuebleDeActivo, inciso: IncisoFiscal): void {
    this.propiedades = { ...this.propiedades, ...valoresDelInmuebleValidos(this.propiedades, valores, inciso) };
  }

  /** Deja la cantidad de piezas (una división o su anulación); lo demás lo reparte quien divide. */
  cambiarCantidad(cantidad: number): void {
    if (!Number.isInteger(cantidad) || cantidad < 1) throw new ActivoInvalido('La cantidad es un entero desde 1.');
    this.propiedades = { ...this.propiedades, cantidad };
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeActivo> {
    return { ...this.propiedades };
  }

  private exigirEnUso(mensaje?: string): void {
    if (this.propiedades.estado !== 'en_uso') throw new ActivoNoEnUso(mensaje);
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
