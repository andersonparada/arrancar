import type { IncisoFiscal } from './incisos-fiscales.js';
import { ActivoInvalido, ValorFiscalSoloEnEdificios } from './errores-de-activo.js';
import type { FormaDeTenencia, OrigenDeActivo, TipoDeRegistro } from './tipos-de-activo.js';

/** Lo que el usuario escribe de un activo al darlo de alta; los montos viajan como texto con dos decimales. */
export interface DatosDeActivo {
  codigo: string;
  descripcion: string;
  claseId: string;
  activoPadreId: string | null;
  tipoDeRegistro: TipoDeRegistro;
  origen: OrigenDeActivo | null;
  propietario: string | null;
  formaDeTenencia: FormaDeTenencia | null;
  fechaDeAdquisicion: string;
  valorComoGanadoComun: string | null;
  valorDeMatricula: string | null;
  valorCatastral: string | null;
  valoresDelInmuebleCompleto: boolean;
  marca: string | null;
  modelo: string | null;
  numeroDeSerie: string | null;
  placa: string | null;
  cantidad: number;
  observaciones: string | null;
}

const FORMATO_DE_CODIGO = /^[A-Za-z0-9./-]{1,30}$/;

/** Recorta y exige que quede algo, sin pasar de `maximo`. */
export function textoRequerido(valor: string, etiqueta: string, maximo: number): string {
  const limpio = valor.trim();
  if (!limpio) throw new ActivoInvalido(`Escriba "${etiqueta}".`);
  if (limpio.length > maximo) throw new ActivoInvalido(`"${etiqueta}" no puede pasar de ${maximo} caracteres.`);
  return limpio;
}

/** Recorta; si queda vacío, es nulo. */
export function textoOpcional(valor: string | null, etiqueta: string, maximo: number): string | null {
  const limpio = valor?.trim() ?? '';
  return limpio ? textoRequerido(limpio, etiqueta, maximo) : null;
}

/** @throws ActivoInvalido si el código no tiene el formato permitido. */
export function validarCodigo(codigo: string): string {
  const limpio = codigo.trim();
  if (!FORMATO_DE_CODIGO.test(limpio))
    throw new ActivoInvalido('El código lleva de 1 a 30 letras, números, punto, guion o diagonal.');
  return limpio;
}

function validarTenencia(datos: DatosDeActivo): void {
  const deTerceros = datos.tipoDeRegistro === 'de_terceros';
  const conTenencia = Boolean(datos.propietario) && Boolean(datos.formaDeTenencia);
  if (deTerceros && !conTenencia)
    throw new ActivoInvalido('Un bien de terceros lleva su propietario y la forma de tenencia.');
  if (!deTerceros && (datos.propietario || datos.formaDeTenencia))
    throw new ActivoInvalido('El propietario y la forma de tenencia son solo de los bienes de terceros.');
}

/** El origen, el propietario y la forma de tenencia se piden según el tipo de registro. */
function validarProcedencia(datos: DatosDeActivo): void {
  validarTenencia(datos);
  const deTerceros = datos.tipoDeRegistro === 'de_terceros';
  if (!deTerceros && !datos.origen) throw new ActivoInvalido('Elija el origen del activo.');
  if (deTerceros && datos.origen) throw new ActivoInvalido('Un bien de terceros no lleva origen.');
}

const esPositivo = (monto: string | null): boolean => monto === null || Number(monto) > 0;

function validarInmueble(datos: DatosDeActivo, inciso: IncisoFiscal): void {
  const conValor = datos.valorDeMatricula !== null || datos.valorCatastral !== null;
  if (conValor && inciso !== 'edificios') throw new ValorFiscalSoloEnEdificios();
  if (!esPositivo(datos.valorDeMatricula) || !esPositivo(datos.valorCatastral))
    throw new ActivoInvalido('La matrícula y el catastro deben ser mayores que cero.');
  if (datos.valoresDelInmuebleCompleto && !conValor)
    throw new ActivoInvalido('"Valores del inmueble completo" necesita la matrícula o el catastro.');
}

function validarGanado(datos: DatosDeActivo, inciso: IncisoFiscal): void {
  const valor = datos.valorComoGanadoComun;
  if (valor !== null && Number(valor) < 0)
    throw new ActivoInvalido('El valor como ganado común no puede ser negativo.');
  if (valor !== null && inciso !== 'reproductores')
    throw new ActivoInvalido('El valor como ganado común es solo de los reproductores.');
  const exigido = inciso === 'reproductores' && datos.tipoDeRegistro === 'activo';
  if (exigido && valor === null) throw new ActivoInvalido('Un reproductor lleva su valor como ganado común.');
}

/** Un terreno no se va a gasto: siempre es un activo (o de terceros), nunca un bien de control (§3.4). */
function validarTerreno(datos: DatosDeActivo, inciso: IncisoFiscal): void {
  if (inciso === 'terrenos' && datos.tipoDeRegistro === 'bien_de_control')
    throw new ActivoInvalido('Un terreno no puede ser un bien de control: regístrelo como activo.');
}

/** La matrícula, el catastro y el valor como ganado común dependen del inciso de la clase (§5.3, A3). */
function validarValoresFiscales(datos: DatosDeActivo, inciso: IncisoFiscal): void {
  validarInmueble(datos, inciso);
  validarGanado(datos, inciso);
  validarTerreno(datos, inciso);
}

function validarCantidad(cantidad: number): void {
  if (!Number.isInteger(cantidad) || cantidad < 1) throw new ActivoInvalido('La cantidad es un entero desde 1.');
}

/** Los tres datos del inmueble que fijan su tope fiscal. */
export type ValoresDelInmuebleDeActivo = Pick<
  DatosDeActivo,
  'valorDeMatricula' | 'valorCatastral' | 'valoresDelInmuebleCompleto'
>;

/**
 * Revisa los valores nuevos del inmueble con las mismas reglas del alta y los devuelve limpios.
 * @throws ActivoInvalido, ValorFiscalSoloEnEdificios.
 */
export function valoresDelInmuebleValidos(
  actual: DatosDeActivo,
  nuevos: ValoresDelInmuebleDeActivo,
  inciso: IncisoFiscal,
): ValoresDelInmuebleDeActivo {
  validarInmueble({ ...actual, ...nuevos }, inciso);
  const { valorDeMatricula, valorCatastral, valoresDelInmuebleCompleto } = nuevos;
  return { valorDeMatricula, valorCatastral, valoresDelInmuebleCompleto };
}

/**
 * Revisa y deja limpios los datos de un activo.
 * @throws ActivoInvalido, ValorFiscalSoloEnEdificios.
 */
export function datosDeActivoValidos(datos: DatosDeActivo, inciso: IncisoFiscal): DatosDeActivo {
  validarProcedencia(datos);
  validarValoresFiscales(datos, inciso);
  validarCantidad(datos.cantidad);
  return {
    ...datos,
    codigo: validarCodigo(datos.codigo),
    descripcion: textoRequerido(datos.descripcion, 'Descripción', 200),
    propietario: textoOpcional(datos.propietario, 'Propietario', 150),
    marca: textoOpcional(datos.marca, 'Marca', 80),
    modelo: textoOpcional(datos.modelo, 'Modelo', 80),
    numeroDeSerie: textoOpcional(datos.numeroDeSerie, 'Número de serie', 80),
    placa: textoOpcional(datos.placa, 'Placa', 80),
    observaciones: textoOpcional(datos.observaciones, 'Observaciones', 500),
  };
}
