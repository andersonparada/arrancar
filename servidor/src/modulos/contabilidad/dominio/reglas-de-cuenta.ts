import type { ClaseDeFlujo, Naturaleza, TratamientoFiscal } from './clasificaciones-de-cuenta.js';
import { CuentaInvalida } from './errores.js';
import { admiteCorriente, tipoDelRubro, type Rubro, type TipoDeCuenta } from './rubros.js';

/** Lo que el usuario puede escribir de una cuenta. */
export interface DatosDeCuenta {
  codigo: string;
  nombre: string;
  esDeDetalle: boolean;
  naturaleza: Naturaleza;
  tipo: TipoDeCuenta;
  rubro: Rubro | null;
  corriente: boolean;
  claseDeFlujo: ClaseDeFlujo | null;
  esMonetaria: boolean;
  pideTercero: boolean;
  pideCentroDeCosto: boolean;
  esDeControl: boolean;
  tratamientoFiscal: TratamientoFiscal;
  activo: boolean;
}

/** Recorta el texto y exige que no quede vacío ni pase del largo. */
export function textoDeCuenta(texto: string, campo: string, maximo: number): string {
  const limpio = texto.trim();
  if (!limpio) throw new CuentaInvalida(`Escriba "${campo}".`);
  if (limpio.length > maximo) throw new CuentaInvalida(`"${campo}" admite hasta ${maximo} caracteres.`);
  return limpio;
}

/** Una cuenta de detalle recibe movimientos, así que dice a qué rubro y a qué flujo pertenece. */
function exigirClasificacionDelDetalle(datos: DatosDeCuenta): void {
  if (!datos.esDeDetalle) return;
  if (!datos.rubro) throw new CuentaInvalida('Una cuenta de detalle lleva su rubro del estado financiero.');
  if (datos.tipo === 'balance' && !datos.claseDeFlujo)
    throw new CuentaInvalida('Una cuenta de detalle del balance lleva su clase de flujo de efectivo.');
}

/** El rubro debe ser del tipo de la cuenta, y «corriente» solo cabe en activo y pasivo. */
function exigirRubroCoherente(datos: DatosDeCuenta): void {
  if (datos.rubro && tipoDelRubro(datos.rubro) !== datos.tipo)
    throw new CuentaInvalida('El rubro no corresponde al tipo de la cuenta (balance o resultados).');
  if (datos.corriente && !(datos.rubro && admiteCorriente(datos.rubro)))
    throw new CuentaInvalida('Solo las cuentas de activo y de pasivo se clasifican en corriente.');
}

/** El tratamiento fiscal es de las cuentas de resultados. */
function exigirTratamientoCoherente(datos: DatosDeCuenta): void {
  if (datos.tipo === 'balance' && datos.tratamientoFiscal !== 'no_aplica')
    throw new CuentaInvalida('El tratamiento fiscal solo se escribe en cuentas de resultados.');
}

/** Normaliza los textos y revisa lo que une los datos entre sí. */
export function datosDeCuentaValidos(datos: DatosDeCuenta): DatosDeCuenta {
  exigirClasificacionDelDetalle(datos);
  exigirRubroCoherente(datos);
  exigirTratamientoCoherente(datos);
  return {
    ...datos,
    codigo: textoDeCuenta(datos.codigo, 'Código', 40),
    nombre: textoDeCuenta(datos.nombre, 'Nombre', 150),
  };
}
