import { textoONulo } from '@/modulos/core/utilidades/edicion';
import type { Cuenta, DatosDeCuenta } from '../servicios/cuentas.api';
import { admiteCorriente, tipoDelRubro } from './rubros';

/** Los anchos de cada nivel de una máscara como `9.9.99.99.999`: [1, 1, 2, 2, 3]. Vacío si la máscara no es válida. */
export function anchosDeMascara(mascara: string | null | undefined): number[] {
  const texto = (mascara ?? '').trim();
  if (!/^9+(\.9+){3,5}$/.test(texto)) return [];
  return texto.split('.').map((grupo) => grupo.length);
}

/** Un código de ejemplo de la máscara más larga: `1.1.01.01.001`. */
export const ejemploDeCodigo = (mascara: string): string =>
  anchosDeMascara(mascara)
    .map((ancho) => '1'.padStart(ancho, '0'))
    .join('.');

/** Una cuenta de mayor admite cuentas inferiores mientras no esté en el último nivel de la máscara. */
export const admiteSubcuentas = (cuenta: Cuenta, mascara: string): boolean =>
  !cuenta.esDeDetalle && cuenta.nivel < anchosDeMascara(mascara).length;

/**
 * El código que sigue entre las cuentas inferiores de `padre` (o del primer nivel si es `null`): el último grupo del
 * mayor más uno. Vacío si no hay máscara, si no cabe otro nivel o si el nivel ya no tiene números libres.
 */
export function codigoPropuesto(cuentas: Cuenta[], padre: Cuenta | null, mascara: string): string {
  const anchos = anchosDeMascara(mascara);
  const nivel = (padre?.nivel ?? 0) + 1;
  if (nivel > anchos.length) return '';
  const hermanas = cuentas.filter((cuenta) => cuenta.padreId === (padre?.id ?? null));
  const mayor = Math.max(0, ...hermanas.map((cuenta) => Number(cuenta.codigo.split('.').pop()) || 0));
  const ancho = anchos[nivel - 1] ?? 0;
  const siguiente = String(mayor + 1);
  if (siguiente.length > ancho) return '';
  const grupo = siguiente.padStart(ancho, '0');
  return padre ? `${padre.codigo}.${grupo}` : grupo;
}

/** Una cuenta nueva: hereda de su superior lo que no cambia (naturaleza y tipo) y propone su código. */
export function cuentaNueva(cuentas: Cuenta[], padre: Cuenta | null, mascara: string): DatosDeCuenta {
  const esUltimoNivel = (padre?.nivel ?? 0) + 1 >= anchosDeMascara(mascara).length;
  return {
    codigo: codigoPropuesto(cuentas, padre, mascara),
    nombre: '',
    esDeDetalle: esUltimoNivel,
    naturaleza: padre?.naturaleza ?? 'deudora',
    tipo: padre?.tipo ?? 'balance',
    rubro: null,
    corriente: false,
    claseDeFlujo: null,
    esMonetaria: false,
    pideTercero: false,
    pideCentroDeCosto: false,
    esDeControl: false,
    tratamientoFiscal: 'no_aplica',
    activo: true,
  };
}

/** Lo editable de una cuenta que ya existe. */
export function datosDeLaCuenta(cuenta: Cuenta): DatosDeCuenta {
  return {
    codigo: cuenta.codigo,
    nombre: cuenta.nombre,
    esDeDetalle: cuenta.esDeDetalle,
    naturaleza: cuenta.naturaleza,
    tipo: cuenta.tipo,
    rubro: cuenta.rubro,
    corriente: cuenta.corriente,
    claseDeFlujo: cuenta.claseDeFlujo,
    esMonetaria: cuenta.esMonetaria,
    pideTercero: cuenta.pideTercero,
    pideCentroDeCosto: cuenta.pideCentroDeCosto,
    esDeControl: cuenta.esDeControl,
    tratamientoFiscal: cuenta.tratamientoFiscal,
    activo: cuenta.activo,
  };
}

/** Qué campos del formulario aplican según lo ya elegido. */
export function camposQueAplican(datos: DatosDeCuenta) {
  return {
    clasificacion: datos.esDeDetalle,
    corriente: datos.esDeDetalle && admiteCorriente(datos.rubro),
    claseDeFlujo: datos.esDeDetalle && datos.tipo === 'balance',
    tratamientoFiscal: datos.tipo === 'resultados',
  };
}

/** Al cambiar el tipo, un rubro de otro tipo ya no cabe y el tratamiento fiscal solo es de resultados. */
export function conTipo(datos: DatosDeCuenta, tipo: DatosDeCuenta['tipo']): DatosDeCuenta {
  const rubroCabe = datos.rubro !== null && tipoDelRubro(datos.rubro) === tipo;
  return {
    ...datos,
    tipo,
    rubro: rubroCabe ? datos.rubro : null,
    corriente: rubroCabe && datos.corriente,
    claseDeFlujo: tipo === 'balance' ? datos.claseDeFlujo : null,
    tratamientoFiscal: tipo === 'balance' ? 'no_aplica' : datos.tratamientoFiscal,
  };
}

/** Al cambiar el rubro, «corriente» se apaga si el nuevo rubro no lo admite. */
export function conRubro(datos: DatosDeCuenta, rubro: string | null): DatosDeCuenta {
  return { ...datos, rubro, corriente: admiteCorriente(rubro) && datos.corriente };
}

/** Lo que se manda al servidor: textos recortados y lo que no aplica, apagado. */
export function datosParaEnviar(datos: DatosDeCuenta): DatosDeCuenta {
  const aplica = camposQueAplican(datos);
  return {
    ...datos,
    codigo: datos.codigo.trim(),
    nombre: datos.nombre.trim(),
    rubro: textoONulo(datos.rubro),
    corriente: aplica.corriente && datos.corriente,
    claseDeFlujo: aplica.claseDeFlujo ? datos.claseDeFlujo : null,
    tratamientoFiscal: aplica.tratamientoFiscal ? datos.tratamientoFiscal : 'no_aplica',
  };
}
