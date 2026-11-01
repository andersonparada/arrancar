import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { DteRecibido, type DatosDelDte } from '../../../dominio/dte-recibido.js';
import type { FilaDelDte } from '../../dte/lector-de-dte-sat.js';
import type { DteRecibidoDto } from '../../dto/dte-recibido.dto.js';
import type { ProveedorPorNit } from '../../puertos/puertos-de-importacion.js';
import { dtoDeDteRecibido } from './dto-de-dte-recibido.js';

/** Lo que ya se sabe de la bandeja y del libro antes de decidir qué hacer con cada fila del archivo. */
export interface ConocimientoPrevio {
  empresaId: string;
  loteId: string;
  existentes: ReadonlyMap<string, DteRecibido>;
  /** Autorización → documento vigente de esta empresa. */
  documentosVigentes: ReadonlyMap<string, string>;
  registradasEnOtraEmpresa: ReadonlySet<string>;
  proveedoresPorNit: ReadonlyMap<string, ProveedorPorNit>;
}

/** Una fila que ya estaba y cambió: la fila con sus datos nuevos, cómo estaba y qué campos cambiaron. */
export interface FilaActualizada {
  fila: DteRecibido;
  anterior: DteRecibidoDto;
  campos: string[];
}

/** Qué hará la carga con cada fila válida del archivo. */
export interface PlanDeCarga {
  nuevas: DteRecibido[];
  actualizadas: FilaActualizada[];
  sinCambio: DteRecibido[];
  /** Filas que llegaron anuladas en la SAT o pasaron a anuladas en esta carga. */
  anuladasEnLaSat: number;
  /** Anuladas en la SAT que ya están registradas aquí: el usuario debe revisarlas. */
  anuladasYaRegistradas: number;
  bloqueadas: number;
}

const CLAVES_DE_LA_SAT = [
  'tipoDte',
  'serie',
  'numero',
  'fechaEmision',
  'nitEmisor',
  'nombreEmisor',
  'nitReceptor',
  'total',
  'iva',
  'idp',
  'otrosImpuestos',
  'otrosImpuestosDetalle',
  'estadoSat',
  'anuladoEnLaSatEl',
] as const satisfies readonly (keyof DatosDelDte)[];

/** Los datos de la SAT que cambiaron entre lo guardado y lo que trae el archivo (sin la fila original). */
function camposQueCambian(guardado: DatosDelDte, nuevo: DatosDelDte): string[] {
  return CLAVES_DE_LA_SAT.filter((clave) => JSON.stringify(guardado[clave]) !== JSON.stringify(nuevo[clave]));
}

function filaNueva(datos: DatosDelDte, conocimiento: ConocimientoPrevio): DteRecibido {
  const proveedor = conocimiento.proveedoresPorNit.get(datos.nitEmisor);
  const fila = DteRecibido.crear({
    empresaId: Identificador.desde<'Empresa'>(conocimiento.empresaId),
    loteId: conocimiento.loteId,
    datos,
    borrador: { proveedorId: proveedor?.activo ? proveedor.id : null },
  });
  const documentoId = conocimiento.documentosVigentes.get(datos.autorizacionFel);
  if (documentoId) fila.registrar(documentoId);
  else if (conocimiento.registradasEnOtraEmpresa.has(datos.autorizacionFel))
    fila.bloquear('registrado_en_otra_empresa');
  return fila;
}

/** Clasifica una fila ya guardada: sin cambio, o actualizada con lo que cambió. */
function clasificarExistente(existente: DteRecibido, datos: DatosDelDte, plan: PlanDeCarga & { loteId: string }): void {
  const anterior = dtoDeDteRecibido(existente, null);
  const campos = camposQueCambian(existente.instantanea(), datos);
  if (campos.length === 0) {
    plan.sinCambio.push(existente);
    return;
  }
  const pasaAAnulada = datos.estadoSat === 'anulado' && existente.instantanea().estadoSat === 'vigente';
  existente.actualizarDatosDeLaSat(datos, plan.loteId);
  plan.actualizadas.push({ fila: existente, anterior, campos });
  if (pasaAAnulada) {
    plan.anuladasEnLaSat++;
    if (existente.estado === 'registrado') plan.anuladasYaRegistradas++;
  }
}

/**
 * Decide qué hace la carga con cada fila válida: crearla (`pendiente`, `registrado` si la autorización ya está vigente
 * en el libro de esta empresa, o `bloqueado` si lo está en otra empresa de la cuenta), actualizar sus datos de la SAT si
 * cambiaron (lo normal: pasó a anulada), o dejarla como está.
 */
export function clasificarCarga(filas: readonly FilaDelDte[], conocimiento: ConocimientoPrevio): PlanDeCarga {
  const plan: PlanDeCarga & { loteId: string } = {
    loteId: conocimiento.loteId,
    nuevas: [],
    actualizadas: [],
    sinCambio: [],
    anuladasEnLaSat: 0,
    anuladasYaRegistradas: 0,
    bloqueadas: 0,
  };
  for (const { datos } of filas) {
    const existente = conocimiento.existentes.get(datos.autorizacionFel);
    if (existente) {
      clasificarExistente(existente, datos, plan);
      continue;
    }
    const nueva = filaNueva(datos, conocimiento);
    plan.nuevas.push(nueva);
    if (nueva.estado === 'bloqueado') plan.bloqueadas++;
    if (datos.estadoSat === 'anulado') plan.anuladasEnLaSat++;
  }
  const { loteId: _loteId, ...resultado } = plan;
  return resultado;
}
