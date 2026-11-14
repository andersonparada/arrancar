import { ContrasenaSinSaldo } from '../../../dominio/errores-de-contrasenas.js';
import { exigirDocumentoDisponible } from '../../../dominio/reglas-de-contrasena.js';
import {
  repartirNotasDeLaContrasena,
  type CargoDeLaContrasena,
  type NotaDeLaContrasena,
  type RepartoDeContrasena,
} from '../../../dominio/reparto-de-contrasena.js';
import { claseDe } from '../../../dominio/tipos-de-documento.js';
import type { RepositorioDeContrasenas } from '../../puertos/puertos-de-contrasenas.js';
import type { ConsultasDeDocumentos, FilaDeDocumento } from '../../puertos/puertos-de-consultas.js';
import type { FechasDeEntrada, RepositorioDeDocumentos } from '../../puertos/puertos-de-documentos.js';
import { bloquear } from '../acciones/dependencias-de-acciones.js';
import { filaExistente, saldoDeLaFila } from '../aplicaciones/dependencias-de-aplicaciones.js';

/** Lo que hace falta para armar los documentos de una contraseña y repartir sus notas. */
export interface DependenciasDeLosDocumentos {
  documentos: RepositorioDeDocumentos;
  consultas: ConsultasDeDocumentos;
  repositorio: RepositorioDeContrasenas;
  fechasDeEntrada: FechasDeEntrada;
}

/** Bloquea los documentos en orden de id (el mismo orden en toda la app, para no cruzar bloqueos). */
export async function bloquearEnOrden(
  { documentos }: Pick<DependenciasDeLosDocumentos, 'documentos'>,
  ids: readonly string[],
): Promise<void> {
  for (const id of [...ids].sort()) await bloquear(documentos, id);
}

/** Las filas de esos documentos, en el orden pedido. @throws RecursoNoEncontrado si alguno no existe. */
export function leerDocumentos(
  { consultas }: Pick<DependenciasDeLosDocumentos, 'consultas'>,
  ids: readonly string[],
): Promise<FilaDeDocumento[]> {
  return Promise.all(ids.map((id) => filaExistente(consultas, id)));
}

/** Revisa que cada documento pueda entrar a una contraseña del proveedor (ya bloqueados). */
export async function exigirDisponibles(
  { repositorio }: Pick<DependenciasDeLosDocumentos, 'repositorio'>,
  { proveedorId, filas }: { proveedorId: string; filas: readonly FilaDeDocumento[] },
): Promise<void> {
  const vigentes = await repositorio.vigentesDe(filas.map(({ documento }) => documento.id));
  for (const fila of filas) {
    exigirDocumentoDisponible(
      { documento: fila.documento, saldoCentavos: saldoDeLaFila(fila) },
      proveedorId,
      vigentes.get(fila.documento.id)?.numero ?? null,
    );
  }
}

/** Reparte las notas entre los cargos; si nada queda por pagar, no hay contraseña que hacer. */
export async function repartirNotas(
  { fechasDeEntrada }: Pick<DependenciasDeLosDocumentos, 'fechasDeEntrada'>,
  { fecha, filas, fechaDeInicio }: { fecha: string; filas: FilaDeDocumento[]; fechaDeInicio: string | null },
): Promise<RepartoDeContrasena> {
  const recepciones = await fechasDeEntrada.deDocumentos(filas.map(({ documento }) => documento.id));
  const entradaDe = (id: string) => recepciones.get(id) ?? fechaDeInicio;
  const cargos = filas.filter(({ documento }) => claseDe(documento.tipo) === 'cargo');
  const notas = filas.filter(({ documento }) => claseDe(documento.tipo) !== 'cargo');
  const reparto = repartirNotasDeLaContrasena(
    fecha,
    notas.map((fila) => comoNota(fila, entradaDe(fila.documento.id))),
    cargos.map((fila) => comoCargo(fila, entradaDe(fila.documento.id))),
  );
  if ([...reparto.saldoPorCargo.values()].every((saldo) => saldo <= 0)) throw new ContrasenaSinSaldo();
  return reparto;
}

function comoCargo(fila: FilaDeDocumento, entrada: string | null): CargoDeLaContrasena {
  const { documento } = fila;
  return {
    id: documento.id,
    saldoCentavos: saldoDeLaFila(fila),
    vencimiento: documento.vencimiento,
    fechaEmision: documento.fechaEmision,
    creadoEn: fila.creadoEn,
    entrada,
  };
}

function comoNota(fila: FilaDeDocumento, entrada: string | null): NotaDeLaContrasena {
  const { documento } = fila;
  return {
    id: documento.id,
    saldoLibreCentavos: saldoDeLaFila(fila),
    fechaEmision: documento.fechaEmision,
    creadoEn: fila.creadoEn,
    entrada,
  };
}
