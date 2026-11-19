import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { contadorDeCaracteres, type EstadoDelContador } from '@/modulos/core/utilidades/contador-de-caracteres';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type {
  CifraDelCuadre,
  HallazgoDeCierre,
  RevisionDeCierre,
  RevisionDeCierreDeModulo,
} from '../servicios/cierre-de-carga.tipos';

export const MAXIMO_DEL_MOTIVO = 500;

/** Las cifras de un módulo que van juntas: los totales (sin título) o las de un registro (una cuenta, un proveedor). */
export interface GrupoDeCifras {
  titulo: string | null;
  cifras: { clave: string; etiqueta: string; valor: string }[];
}

/** Lo que se muestra de un módulo: lo que pide motivo primero, luego los avisos, y sus cifras agrupadas. */
export interface BloqueDeRevision {
  nombre: string;
  resumen: string | null;
  ruta: string | null;
  hallazgos: HallazgoDeCierre[];
  sinObservaciones: boolean;
  gruposDeCifras: GrupoDeCifras[];
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** «2 diferencias y 3 avisos», «1 aviso» o «Sin observaciones». */
export function textoDelConteo(diferencias: number, avisos: number): string {
  const partes = [
    ...(diferencias > 0 ? [plural(diferencias, 'diferencia', 'diferencias')] : []),
    ...(avisos > 0 ? [plural(avisos, 'aviso', 'avisos')] : []),
  ];
  return partes.length > 0 ? partes.join(' y ') : 'Sin observaciones';
}

/** El monto con el formato de la empresa; las cantidades, como enteros con miles. */
export function formatearCifra({ tipo, valor }: Pick<CifraDelCuadre, 'tipo' | 'valor'>): string {
  if (tipo === 'monto') return formatearMonto(valor);
  return new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 }).format(Number(valor));
}

/** Los totales primero y después un grupo por registro, en el orden en que llegaron. */
export function agruparCifras(cifras: CifraDelCuadre[]): GrupoDeCifras[] {
  const grupos = new Map<string, GrupoDeCifras>();
  for (const cifra of cifras) {
    const llave = cifra.registro?.id ?? '';
    const grupo = grupos.get(llave) ?? { titulo: cifra.registro?.nombre ?? null, cifras: [] };
    grupo.cifras.push({ clave: cifra.clave, etiqueta: cifra.etiqueta, valor: formatearCifra(cifra) });
    grupos.set(llave, grupo);
  }
  const todos = [...grupos.entries()];
  return [...todos.filter(([llave]) => llave === ''), ...todos.filter(([llave]) => llave !== '')].map(([, g]) => g);
}

const ordenDeNivel = (hallazgo: HallazgoDeCierre) => (hallazgo.nivel === 'pide_motivo' ? 0 : 1);

/** Un bloque por módulo, con lo que pide motivo antes que los avisos. */
export function bloquesDeRevision(modulos: RevisionDeCierreDeModulo[]): BloqueDeRevision[] {
  return modulos.map((modulo) => ({
    nombre: modulo.nombreDelModulo,
    resumen: modulo.resumen,
    ruta: modulo.ruta,
    hallazgos: [...modulo.hallazgos].sort((a, b) => ordenDeNivel(a) - ordenDeNivel(b)),
    sinObservaciones: modulo.hallazgos.length === 0,
    gruposDeCifras: agruparCifras(modulo.cifras),
  }));
}

/** El contador «32 de 500 caracteres» del motivo. */
export const contadorDelMotivo = (motivo: string): EstadoDelContador => contadorDeCaracteres(motivo, MAXIMO_DEL_MOTIVO);

/** Qué corregir en el motivo antes de enviarlo; `null` si está bien (vacío vale cuando no es obligatorio). */
export function problemaDelMotivo(motivo: string, obligatorio: boolean, diferencias: number): string | null {
  const { usados, error } = contadorDelMotivo(motivo);
  if (error) return error;
  if (usados === 0 && obligatorio) {
    return `Escriba el motivo: se va a cerrar con ${plural(diferencias, 'diferencia', 'diferencias')} y debe quedar explicado.`;
  }
  return null;
}

/** El motivo que se manda al servidor: sin espacios al borde, o nada si no se escribió. */
export const motivoParaEnviar = (motivo: string): string | undefined => motivo.trim() || undefined;

/** Lo que pasó al intentar cerrar, para saber qué mostrar. */
export type ResultadoDelCierre =
  | { tipo: 'desactualizada'; revision: RevisionDeCierre | null }
  | { tipo: 'motivo'; mensaje: string; revision: RevisionDeCierre | null }
  | { tipo: 'otro' };

/** Si lo que llegó en `detalles` es una revisión completa (y no, por ejemplo, una lista de errores por campo). */
export function esRevision(valor: unknown): valor is RevisionDeCierre {
  const revision = valor as Partial<RevisionDeCierre> | null | undefined;
  return Array.isArray(revision?.modulos) && typeof revision?.huella === 'string';
}

const CODIGOS_DE_MOTIVO = ['motivo_de_cierre_requerido', 'motivo_de_cierre_invalido'];

/** Clasifica el error del cierre: revisión que cambió, motivo que falta o sobra, u otro. */
export function interpretarErrorDelCierre(error: unknown): ResultadoDelCierre {
  if (!(error instanceof ErrorApi)) return { tipo: 'otro' };
  const revision = esRevision(error.detalles) ? error.detalles : null;
  if (error.codigo === 'revision_de_cierre_desactualizada') return { tipo: 'desactualizada', revision };
  if (CODIGOS_DE_MOTIVO.includes(error.codigo)) return { tipo: 'motivo', mensaje: error.message, revision };
  return { tipo: 'otro' };
}

export const AVISO_DE_REVISION_DESACTUALIZADA =
  'Los saldos cambiaron mientras revisaba. Lea de nuevo lo que encontró cada módulo y confirme otra vez.';

/** La ruta de la pantalla donde se corrige, solo si existe y el usuario puede entrar a ella. */
export function destinoDeRevision(
  ruta: string | null,
  resolver: (ruta: string) => { matched: unknown[]; meta: { permiso?: string } },
  puede: (permiso: string) => boolean,
): string | null {
  if (!ruta) return null;
  const { matched, meta } = resolver(ruta);
  if (matched.length === 0) return null;
  return !meta.permiso || puede(meta.permiso) ? ruta : null;
}
