import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { ErrorEsperado } from '../../../../core/compartido/dominio/errores.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { DteSinConcepto, DteSinProveedor, FaltaLaFechaDeRecepcion } from '../../../dominio/errores-de-bandeja.js';
import type { DocumentoDto } from '../../dto/documento.dto.js';
import type { RepositorioDeDteRecibidos } from '../../puertos/repositorio-de-dte-recibidos.js';
import type { PrevisualizarDocumento } from '../documentos/previsualizar-documento.js';
import type { ArmadorDeSolicitudDelDte } from './armador-de-solicitud-del-dte.js';
import { solicitudCompleta, type DatosFiscalesPorProveedor } from './decisiones-del-dte.js';
import type { ProponedorDeDte } from './proponedor-de-dte.js';
import { MARCA_DE_MONTOS_DE_LA_SAT, type DecisionesDelDte } from './solicitud-desde-el-dte.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  filas: RepositorioDeDteRecibidos;
  armador: ArmadorDeSolicitudDelDte;
  previsualizar: PrevisualizarDocumento;
  crearProponedor: (operador: Operador) => ProponedorDeDte;
}

interface OpcionesDeVistaPrevia {
  proponedor: ProponedorDeDte;
  datosFiscalesPorProveedor: DatosFiscalesPorProveedor;
}

export type ResultadoDeVistaPrevia =
  | { id: string; documento: DocumentoDto; avisos: string[] }
  | { id: string; error: { codigo: string; mensaje: string; detalles?: unknown } };

/**
 * La vista previa de lo que registraría la confirmación de cada fila (totales, motivo, retenciones propuestas y avisos),
 * con el mismo cálculo del formulario y sin guardar nada. Una fila con un problema responde su error y no frena las demás.
 */
export class VistaPreviaDeDteRecibidos {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(
    operador: Operador,
    peticion: { ids: readonly string[]; datosFiscalesPorProveedor: DatosFiscalesPorProveedor },
  ): Promise<{ resultados: ResultadoDeVistaPrevia[] }> {
    const proponedor = this.dependencias.crearProponedor(operador);
    const resultados: ResultadoDeVistaPrevia[] = [];
    for (const id of new Set(peticion.ids)) {
      resultados.push(await this.deUna(operador, id, { proponedor, ...peticion }));
    }
    return { resultados };
  }

  private async deUna(
    operador: Operador,
    id: string,
    opciones: OpcionesDeVistaPrevia,
  ): Promise<ResultadoDeVistaPrevia> {
    try {
      const { peticion, avisos } = await this.dependencias.unidadDeTrabajo.ejecutar(operador, () =>
        this.preparar(operador, id, opciones),
      );
      const { documento, avisos: delCalculo } = await this.dependencias.previsualizar.ejecutar(operador, peticion);
      return { id, documento, avisos: [MARCA_DE_MONTOS_DE_LA_SAT, ...avisos, ...delCalculo] };
    } catch (error) {
      if (!(error instanceof ErrorEsperado)) throw error;
      return { id, error: { codigo: error.codigo, mensaje: error.message, detalles: error.detalles } };
    }
  }

  private async preparar(operador: Operador, id: string, opciones: OpcionesDeVistaPrevia) {
    const fila = await this.dependencias.filas.buscar(Identificador.desde<'DteRecibido'>(id));
    if (!fila) throw new RecursoNoEncontrado('El DTE recibido');
    const { decisiones, solicitud, avisos } = await this.dependencias.armador.armar(operador, fila, opciones);
    const { proveedorId, conceptoId } = exigirLoQueNecesitaElCalculo(decisiones);
    const completas = { proveedorId, conceptoId, destino: decisiones.destino };
    return { peticion: { solicitud: solicitudCompleta(solicitud, completas), puedeAjustarRetenciones: false }, avisos };
  }
}

/** El cálculo necesita la recepción, el proveedor y el concepto; el destino no (la vista previa se calcula sin él). */
function exigirLoQueNecesitaElCalculo(decisiones: DecisionesDelDte): { proveedorId: string; conceptoId: string } {
  const { fechaRecepcion, proveedorId, conceptoId } = decisiones;
  if (fechaRecepcion === null) throw new FaltaLaFechaDeRecepcion();
  if (proveedorId === null) throw new DteSinProveedor();
  if (conceptoId === null) throw new DteSinConcepto();
  return { proveedorId, conceptoId };
}
