import type { DocumentoConAplicaciones } from './documento-por-pagar.js';
import { numeroDeContrasena } from './contrasena.js';
import { etiquetaDe } from './documento-por-pagar.js';
import { DocumentoEnContrasena } from './errores-de-contrasenas.js';
import { DocumentoConPagos, NotaConReintegros } from './errores-de-pagos.js';
import { numeroDelPago } from './pagos.js';
import {
  CargoConAplicacionesManuales,
  CargoConNotasAplicadas,
  DocumentoAutorizado,
  NotaConAjustes,
} from './errores.js';

/**
 * Una regla que puede rechazar la baja de un documento (anularlo o eliminarlo) lanzando su error. Las listas de reglas se
 * arman al componer el módulo, así que cada paso nuevo suma las suyas sin tocar los casos de uso: contraseñas (CP3) y
 * pagos (CP4).
 */
export type ReglaDeBaja = (guardado: DocumentoConAplicaciones) => void | Promise<void>;

/**
 * Un documento en una contraseña vigente no se da de baja ni se corrige: la contraseña es un papel que tiene el proveedor.
 * Primero se quita de ella o se anula. Los de contraseñas anuladas sí (la cascada se lleva esas filas).
 */
export const noEstarEnContrasena: ReglaDeBaja = ({ documento, contrasenaVigente }) => {
  if (!contrasenaVigente) return;
  const { numero, anioDeNumero } = contrasenaVigente;
  throw new DocumentoEnContrasena(etiquetaDe(documento), numeroDeContrasena(numero, anioDeNumero));
};

/** Un documento autorizado ya se provisionó: solo se anula. */
export const noEstarAutorizado: ReglaDeBaja = ({ documento }) => {
  if (documento.estado === 'autorizado') throw new DocumentoAutorizado();
};

/**
 * Una factura con notas de crédito aplicadas por la recepción (las automáticas, que Libro de compras también cuida) no se
 * da de baja. Las notas de débito sí: lo que les aplicaron vuelve al saldo libre de esas notas. Las aplicaciones
 * manuales de una factura o de una nota de débito las ataja antes `noTenerAplicacionesManualesRecibidas`.
 */
export const noTenerNotasAplicadas: ReglaDeBaja = ({ documento, recibidas }) => {
  const esFactura = documento.tipo !== 'nota_de_credito' && documento.tipo !== 'nota_de_debito';
  if (esFactura && recibidas.length > 0) throw new CargoConNotasAplicadas();
};

/**
 * Un cargo (también una nota de débito) que recibió saldo a favor por una aplicación manual no se da de baja: primero se
 * quita esa aplicación. Corre igual cuando la baja llega por aviso de Libro de compras.
 */
export const noTenerAplicacionesManualesRecibidas: ReglaDeBaja = ({ documento, recibidas }) => {
  const notas = recibidas
    .filter(({ forma }) => forma === 'manual')
    .map((aplicacion) => etiquetaDe({ serie: aplicacion.otraSerie, numero: aplicacion.otroNumero }));
  if (notas.length > 0) throw new CargoConAplicacionesManuales(etiquetaDe(documento), [...new Set(notas)]);
};

/** Una nota con ajustes vigentes no se anula ni se elimina; los anulados quedan de rastro (o se van con la nota). */
export const noTenerAjustesVigentes: ReglaDeBaja = ({ documento, ajustes }) => {
  if (ajustes.some(({ estado }) => estado === 'vigente')) throw new NotaConAjustes(etiquetaDe(documento));
};

/**
 * Un documento con pagos vigentes no se da de baja, ni se desautoriza, ni se corrige: va **antes** que la de la contraseña
 * porque con pagos tampoco se puede quitar de ella, y lo correcto es decirle «anule el pago N».
 */
export const noTenerPagosVigentes: ReglaDeBaja = ({ documento, pagos }) => {
  const vigentes = pagos.filter(({ estado }) => estado === 'vigente');
  if (vigentes.length === 0) return;
  const numeros = [...new Set(vigentes.map(({ numero, anioDeNumero }) => numeroDelPago(numero, anioDeNumero)))];
  throw new DocumentoConPagos(etiquetaDe(documento), numeros);
};

/** Una nota con reintegros vigentes no se anula ni se elimina; los anulados quedan de rastro (o se van con la nota). */
export const noTenerReintegrosVigentes: ReglaDeBaja = ({ documento, reintegros }) => {
  if (reintegros.some(({ estado }) => estado === 'vigente')) throw new NotaConReintegros(etiquetaDe(documento));
};

export const REGLAS_PARA_ANULAR: readonly ReglaDeBaja[] = [
  noTenerPagosVigentes,
  noTenerReintegrosVigentes,
  noEstarEnContrasena,
  noTenerAplicacionesManualesRecibidas,
  noTenerAjustesVigentes,
  noTenerNotasAplicadas,
];

export const REGLAS_PARA_ELIMINAR: readonly ReglaDeBaja[] = [
  noTenerPagosVigentes,
  noTenerReintegrosVigentes,
  noEstarEnContrasena,
  noEstarAutorizado,
  noTenerAplicacionesManualesRecibidas,
  noTenerAjustesVigentes,
  noTenerNotasAplicadas,
];

/** Desautorizar sí se permite con el documento en una contraseña (admite registrados), pero no con pagos vigentes. */
export const REGLAS_PARA_DESAUTORIZAR: readonly ReglaDeBaja[] = [noTenerPagosVigentes];
