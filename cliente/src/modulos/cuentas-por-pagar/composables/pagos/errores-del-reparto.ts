import { contadorDeCaracteres } from '@/modulos/core/utilidades/contador-de-caracteres';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import { centavosDe, textoDeCentavos } from '../dinero';
import { MAXIMO_DE_REFERENCIA } from './edicion-de-pago';
import { fechaMinimaDelPago } from './fechas-del-pago';
import {
  documentosDelReparto,
  lineasDelProveedor,
  MAXIMO_DE_DOCUMENTOS_EN_EL_REPARTO,
  MAXIMO_DE_DOCUMENTOS_POR_PAGO,
  MAXIMO_DE_PROVEEDORES_EN_EL_REPARTO,
  MAXIMO_DE_QUIEN_RECIBE,
  MAXIMO_DEL_MOTIVO_SIN_BANCARIZAR,
  proveedoresConPago,
  quedaDelRetiro,
  totalDelReparto,
  type ProveedorDelReparto,
} from './reparto-de-efectivo';

type Errores = Record<string, string>;

export const claveDeProveedor = (proveedorId: string, campo: string): string => `proveedor.${proveedorId}.${campo}`;

function erroresDeLaFecha(proveedor: ProveedorDelReparto, hoy: string, fechaDelRetiro: string): Errores {
  const { fecha } = proveedor.edicion;
  const clave = claveDeProveedor(proveedor.proveedorId, 'fecha');
  if (!fecha) return { [clave]: 'Escriba la fecha del pago.' };
  if (fecha > hoy) return { [clave]: 'No puede ser futura: no hay efectivo posfechado.' };
  const minima = proveedor.datos ? fechaMinimaDelPago(lineasDelProveedor(proveedor), proveedor.datos) : null;
  const limites = [{ fecha: fechaDelRetiro, porque: 'la fecha del retiro' }, ...(minima ? [minima] : [])];
  const infringido = limites.find((limite) => fecha < limite.fecha);
  return infringido
    ? { [clave]: `No puede ser anterior al ${formatearFecha(infringido.fecha)}, ${infringido.porque}.` }
    : {};
}

/** Un monto que pasa de lo que se debe del documento. */
function erroresDeMontosMayoresAlSaldo(proveedor: ProveedorDelReparto): Errores {
  const errores: Errores = {};
  for (const { cargo, centavos } of lineasDelProveedor(proveedor)) {
    if (centavos <= (centavosDe(cargo.saldo) ?? 0)) continue;
    errores[`monto.${cargo.id}`] =
      `Este documento solo debe ${formatearMonto(cargo.saldo)}: escriba ese monto o menos.`;
  }
  return errores;
}

/** Un monto que no es un importe de hasta dos decimales (vacío es «no pagar este documento»). */
function erroresDeMontosMalEscritos(proveedor: ProveedorDelReparto): Errores {
  const errores: Errores = {};
  for (const cargo of proveedor.datos?.cargos ?? []) {
    const texto = (proveedor.edicion.montos[cargo.id] ?? '').trim();
    if (texto === '' || centavosDe(texto) !== null) continue;
    errores[`monto.${cargo.id}`] = 'Escriba el monto con hasta dos decimales, por ejemplo 1250.50.';
  }
  return errores;
}

function erroresDeLosTextos(proveedor: ProveedorDelReparto): Errores {
  const errores: Errores = {};
  const recibe = contadorDeCaracteres(proveedor.recibidoPor, MAXIMO_DE_QUIEN_RECIBE).error;
  const referencia = contadorDeCaracteres(proveedor.edicion.referencia, MAXIMO_DE_REFERENCIA).error;
  const motivo = contadorDeCaracteres(proveedor.motivoSinBancarizar, MAXIMO_DEL_MOTIVO_SIN_BANCARIZAR).error;
  if (recibe) errores[claveDeProveedor(proveedor.proveedorId, 'recibidoPor')] = recibe;
  if (referencia) errores[claveDeProveedor(proveedor.proveedorId, 'referencia')] = referencia;
  if (proveedor.pedirMotivo && !proveedor.motivoSinBancarizar.trim()) {
    errores[claveDeProveedor(proveedor.proveedorId, 'motivoSinBancarizar')] =
      'Escriba por qué se paga en efectivo sobre el umbral, o quite este proveedor y pague con cheque.';
  } else if (motivo) {
    errores[claveDeProveedor(proveedor.proveedorId, 'motivoSinBancarizar')] = motivo;
  }
  return errores;
}

/** Un pago lleva hasta 100 documentos; por omisión se propone el saldo de todos, así que se avisa cómo reducirlos. */
function erroresDeLaCantidad(proveedor: ProveedorDelReparto): Errores {
  const cuantos = lineasDelProveedor(proveedor).length;
  if (cuantos <= MAXIMO_DE_DOCUMENTOS_POR_PAGO) return {};
  return {
    [claveDeProveedor(proveedor.proveedorId, 'general')]:
      `Un pago lleva hasta ${MAXIMO_DE_DOCUMENTOS_POR_PAGO} documentos y este lleva ${cuantos}: quite contraseñas o ` +
      'borre el monto de algunos documentos y págueles después en otro reparto.',
  };
}

function erroresDelProveedor(proveedor: ProveedorDelReparto, hoy: string, fechaDelRetiro: string): Errores {
  if (!proveedor.datos) {
    return { [claveDeProveedor(proveedor.proveedorId, 'sinDatos')]: 'Espere a que carguen sus documentos.' };
  }
  if (lineasDelProveedor(proveedor).length === 0) {
    return {
      [claveDeProveedor(proveedor.proveedorId, 'sinMonto')]:
        'Escriba el monto de al menos un documento o quite a este proveedor del reparto.',
      ...erroresDeMontosMalEscritos(proveedor),
    };
  }
  return {
    ...erroresDeLaCantidad(proveedor),
    ...erroresDeMontosMayoresAlSaldo(proveedor),
    ...erroresDeMontosMalEscritos(proveedor),
    ...erroresDeLaFecha(proveedor, hoy, fechaDelRetiro),
    ...erroresDeLosTextos(proveedor),
  };
}

export interface ContextoDelReparto {
  /** Lo que le queda al retiro antes de repartir. */
  disponible: string;
  fechaDelRetiro: string;
  hoy: string;
}

/** Los errores por campo (con la clave del proveedor o del documento) y el general en `reparto`; vacío si todo está bien. */
export function erroresDelReparto(proveedores: readonly ProveedorDelReparto[], contexto: ContextoDelReparto): Errores {
  if (proveedores.length === 0) return { reparto: 'Agregue al menos un proveedor al reparto.' };
  const errores = proveedores.reduce<Errores>(
    (todos, proveedor) => ({ ...todos, ...erroresDelProveedor(proveedor, contexto.hoy, contexto.fechaDelRetiro) }),
    {},
  );
  if (proveedores.length > MAXIMO_DE_PROVEEDORES_EN_EL_REPARTO) {
    errores.reparto = `Un reparto lleva de 1 a ${MAXIMO_DE_PROVEEDORES_EN_EL_REPARTO} proveedores: haga otro reparto con el resto.`;
  } else if (documentosDelReparto(proveedores) > MAXIMO_DE_DOCUMENTOS_EN_EL_REPARTO) {
    errores.reparto = `Un reparto lleva hasta ${MAXIMO_DE_DOCUMENTOS_EN_EL_REPARTO} documentos en total: haga otro reparto con el resto.`;
  } else if (quedaDelRetiro(contexto.disponible, proveedores) < 0) {
    errores.reparto =
      `Al retiro solo le quedan ${formatearMonto(contexto.disponible)} en efectivo y este reparto suma ` +
      `${formatearMonto(textoDeCentavos(totalDelReparto(proveedores)))}: baje montos o quite proveedores. ` +
      'Si el efectivo no alcanza, registre otro retiro.';
  }
  return errores;
}

const CAMPOS_DEL_PAGO = new Set(['fecha', 'recibidoPor', 'referencia', 'observaciones', 'motivoSinBancarizar']);

/** A dónde va un error del pago `indice`: el monto de su documento, un campo del proveedor o su error general. */
function claveDelErrorDelPago(resto: string, proveedor: ProveedorDelReparto): string {
  const linea = /^aplicaciones\.(\d+)\./.exec(resto);
  const cargo = linea ? lineasDelProveedor(proveedor)[Number(linea[1])]?.cargo : undefined;
  if (cargo) return `monto.${cargo.id}`;
  return claveDeProveedor(proveedor.proveedorId, CAMPOS_DEL_PAGO.has(resto) ? resto : 'general');
}

/**
 * Pasa los campos del servidor (`pagos.1.aplicaciones.0.monto`, `pagos.0.motivoSinBancarizar`…) a los de la pantalla (el
 * monto del documento, el campo del proveedor o el error general), usando el orden en que se mandaron los pagos.
 */
export function repartirErroresDelReparto(errores: Errores, proveedores: readonly ProveedorDelReparto[]): Errores {
  const enviados = proveedoresConPago(proveedores);
  const resultado: Errores = {};
  for (const [campo, mensaje] of Object.entries(errores)) {
    const partes = /^pagos\.(\d+)\.(.+)$/.exec(campo);
    const proveedor = partes ? enviados[Number(partes[1])] : undefined;
    if (partes && proveedor) resultado[claveDelErrorDelPago(partes[2]!, proveedor)] = mensaje;
    else resultado[campo.startsWith('pagos') ? 'reparto' : campo] = mensaje;
  }
  return resultado;
}

/**
 * El servidor bloquea con el error del motivo de la excepción cuando el pago no lo traía: ese texto es el bloqueo (se queda
 * en el proveedor) y no un error de campo. Devuelve los errores sin esos y los proveedores bloqueados.
 */
export function separarBloqueos(
  errores: Errores,
  proveedores: readonly ProveedorDelReparto[],
): { errores: Errores; bloqueos: Record<string, string> } {
  const restantes = { ...errores };
  const bloqueos: Record<string, string> = {};
  for (const proveedor of proveedores) {
    const clave = claveDeProveedor(proveedor.proveedorId, 'motivoSinBancarizar');
    if (clave in restantes && !proveedor.pedirMotivo) {
      bloqueos[proveedor.proveedorId] = restantes[clave]!;
      delete restantes[clave];
    }
  }
  return { errores: restantes, bloqueos };
}
