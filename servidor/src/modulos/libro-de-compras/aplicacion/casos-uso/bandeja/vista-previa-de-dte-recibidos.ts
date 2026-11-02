import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { ErrorEsperado } from '../../../../core/compartido/dominio/errores.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { DteSinConcepto, FaltaLaFechaDeRecepcion } from '../../../dominio/errores-de-bandeja.js';
import type { DocumentoDto } from '../../dto/documento.dto.js';
import type { RepositorioDeDteRecibidos } from '../../puertos/repositorio-de-dte-recibidos.js';
import type { PrevisualizarDocumento } from '../documentos/previsualizar-documento.js';
import type { ArmadorDeSolicitudDelDte } from './armador-de-solicitud-del-dte.js';
import {
  solicitudCompleta,
  type DatosFiscalesPorProveedor,
  type ProveedoresNuevosPorNit,
} from './decisiones-del-dte.js';
import type { ProponedorDeDte } from './proponedor-de-dte.js';
import type { ProveedorDeLaFila, ProveedorNuevoDeLaFila } from './proveedor-de-la-fila.js';
import { MARCA_DE_MONTOS_DE_LA_SAT, type DecisionesDelDte } from './solicitud-desde-el-dte.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  filas: RepositorioDeDteRecibidos;
  armador: ArmadorDeSolicitudDelDte;
  previsualizar: PrevisualizarDocumento;
  proveedorDeLaFila: ProveedorDeLaFila;
  crearProponedor: (operador: Operador) => ProponedorDeDte;
}

export interface PeticionDeVistaPrevia {
  ids: readonly string[];
  datosFiscalesPorProveedor: DatosFiscalesPorProveedor;
  /** Lo que el usuario ya confirmó de los proveedores nuevos; si falta el de un NIT, se usa la propuesta. */
  proveedoresNuevos: ProveedoresNuevosPorNit;
  /** El usuario tiene `proveedores.crear`. */
  puedeCrearProveedores: boolean;
}

interface OpcionesDeVistaPrevia extends Omit<PeticionDeVistaPrevia, 'ids'> {
  proponedor: ProponedorDeDte;
}

export type ResultadoDeVistaPrevia =
  | { id: string; documento: DocumentoDto; avisos: string[]; proveedorNuevo?: ProveedorNuevoDeLaFila }
  | { id: string; error: { codigo: string; mensaje: string; detalles?: unknown } };

/** Corta la transacción de la vista previa llevando su resultado: nada de lo que se probó se guarda. */
class VistaPreviaTerminada extends Error {
  constructor(readonly resultado: ResultadoDeVistaPrevia) {
    super('Vista previa terminada');
  }
}

/**
 * La vista previa de lo que registraría la confirmación de cada fila (totales, motivo, retenciones propuestas y avisos),
 * con el mismo cálculo del formulario. Cada fila corre en **una** transacción que siempre se deshace (un ensayo, como
 * el de importar): el proveedor nuevo se crea de verdad para revisar NIT, nombre y unicidad con las reglas de
 * confirmar, y `proveedorNuevo` cuenta qué se haría. Una fila con un problema responde su error y no frena las demás.
 */
export class VistaPreviaDeDteRecibidos {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(
    operador: Operador,
    peticion: PeticionDeVistaPrevia,
  ): Promise<{ resultados: ResultadoDeVistaPrevia[] }> {
    const { ids, ...resto } = peticion;
    const opciones = { proponedor: this.dependencias.crearProponedor(operador), ...resto };
    const resultados: ResultadoDeVistaPrevia[] = [];
    for (const id of new Set(ids)) resultados.push(await this.deUna(operador, id, opciones));
    return { resultados };
  }

  private async deUna(
    operador: Operador,
    id: string,
    opciones: OpcionesDeVistaPrevia,
  ): Promise<ResultadoDeVistaPrevia> {
    try {
      return await this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
        throw new VistaPreviaTerminada(await this.calcular(operador, id, opciones));
      });
    } catch (error) {
      if (error instanceof VistaPreviaTerminada) return error.resultado;
      if (!(error instanceof ErrorEsperado)) throw error;
      return { id, error: { codigo: error.codigo, mensaje: error.message, detalles: error.detalles } };
    }
  }

  private async calcular(operador: Operador, id: string, opciones: OpcionesDeVistaPrevia) {
    const fila = await this.dependencias.filas.buscar(Identificador.desde<'DteRecibido'>(id));
    if (!fila) throw new RecursoNoEncontrado('El DTE recibido');
    const { decisiones, solicitud, avisos } = await this.dependencias.armador.armar(operador, fila, opciones);
    const { conceptoId } = exigirLoQueNecesitaElCalculo(decisiones);
    const { proveedorId, nuevo } = await this.dependencias.proveedorDeLaFila.resolver(operador, fila, {
      ...opciones,
      decisiones,
      exigirConfirmado: false,
    });
    const completas = { proveedorId, conceptoId, destino: decisiones.destino };
    const peticion = { solicitud: solicitudCompleta(solicitud, completas), puedeAjustarRetenciones: false };
    const { documento, avisos: delCalculo } = await this.dependencias.previsualizar.ejecutar(operador, peticion);
    const resultado = { id, documento, avisos: [MARCA_DE_MONTOS_DE_LA_SAT, ...avisos, ...delCalculo] };
    return nuevo ? { ...resultado, proveedorNuevo: nuevo } : resultado;
  }
}

/** El cálculo necesita la recepción y el concepto; el destino no (la vista previa se calcula sin él) y el proveedor se resuelve aparte. */
function exigirLoQueNecesitaElCalculo(decisiones: DecisionesDelDte): { conceptoId: string } {
  const { fechaRecepcion, conceptoId } = decisiones;
  if (fechaRecepcion === null) throw new FaltaLaFechaDeRecepcion();
  if (conceptoId === null) throw new DteSinConcepto();
  return { conceptoId };
}
