import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { cambiosDefinidos, exigirBorradorValido, type CambiosAlBorrador } from '../../../dominio/borrador-del-dte.js';
import type { DteRecibido } from '../../../dominio/dte-recibido.js';
import { CatalogoInactivo, ProveedorInactivo } from '../../../dominio/errores-de-documento.js';
import type { DteRecibidoDto, PropuestaDeDteDto } from '../../dto/dte-recibido.dto.js';
import type {
  CatalogosParaDocumentos,
  ConsultasDeDocumentos,
  ProveedoresParaDocumentos,
} from '../../puertos/puertos-de-documentos.js';
import type { RepositorioDeDteRecibidos } from '../../puertos/repositorio-de-dte-recibidos.js';
import { dtoDeDteRecibido } from './dto-de-dte-recibido.js';
import type { ProponedorDeDte } from './proponedor-de-dte.js';

/** Los campos que se pueden llenar con su propuesta en vez de escribirlos. */
export const CAMPOS_CON_PROPUESTA = ['proveedorId', 'conceptoId', 'destino', 'fechaRecepcion', 'periodo'] as const;
export type CampoConPropuesta = (typeof CAMPOS_CON_PROPUESTA)[number];

export interface PeticionDeCompletar {
  ids: readonly string[];
  cambios: CambiosAlBorrador;
  /** Los campos que se llenan con la propuesta de cada fila (después de aplicar `cambios`). */
  aplicarPropuestas: readonly CampoConPropuesta[];
}

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  filas: RepositorioDeDteRecibidos;
  proveedores: ProveedoresParaDocumentos;
  catalogos: CatalogosParaDocumentos;
  consultas: ConsultasDeDocumentos;
  crearProponedor: (operador: Operador) => ProponedorDeDte;
}

const SIN_PROPUESTA = (propuesta: PropuestaDeDteDto, campo: CampoConPropuesta): CambiosAlBorrador => {
  const valor = propuesta[campo];
  return valor === null ? {} : { [campo]: valor };
};

/**
 * Completa en lote el borrador de filas pendientes: el proveedor, el concepto, el destino, la recepción y el período, ya
 * sea con lo que escribe el usuario o con la propuesta de cada fila («Usar la fecha de emisión», «Usar el último concepto
 * del proveedor»). No audita: es un borrador. Todas las filas cambian o ninguna.
 */
export class CompletarDteRecibidos {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado si una fila, el proveedor, el concepto o la factura no existen.
   * @throws DteNoEstaPendiente, ProveedorInactivo, CatalogoInactivo, BorradorDeDteInvalido o FacturaSoloEnNotas.
   */
  ejecutar(operador: Operador, peticion: PeticionDeCompletar): Promise<DteRecibidoDto[]> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const cambios = cambiosDefinidos(peticion.cambios);
      await this.exigirCatalogos(cambios);
      const proponedor = this.dependencias.crearProponedor(operador);
      const resultado: DteRecibidoDto[] = [];
      for (const id of new Set(peticion.ids)) {
        const fila = await this.fila(id);
        await this.completar(fila, { ...peticion, cambios }, proponedor);
        resultado.push(dtoDeDteRecibido(fila, await proponedor.proponer(fila)));
      }
      return resultado;
    });
  }

  private async completar(fila: DteRecibido, peticion: PeticionDeCompletar, proponedor: ProponedorDeDte) {
    exigirBorradorValido(fila.instantanea(), peticion.cambios);
    fila.completar(peticion.cambios);
    if (peticion.aplicarPropuestas.length > 0) {
      const propuesta = await proponedor.proponer(fila);
      fila.completar(Object.assign({}, ...peticion.aplicarPropuestas.map((campo) => SIN_PROPUESTA(propuesta, campo))));
    }
    await this.dependencias.filas.guardar(fila);
  }

  private async fila(id: string): Promise<DteRecibido> {
    const fila = await this.dependencias.filas.bloquear(Identificador.desde<'DteRecibido'>(id));
    if (!fila) throw new RecursoNoEncontrado('El DTE recibido');
    return fila;
  }

  /** El proveedor, el concepto y la factura que se escogen existen (y están activos); el borrador solo guarda sus ids. */
  private async exigirCatalogos({ proveedorId, conceptoId, documentoAfectadoId }: CambiosAlBorrador): Promise<void> {
    if (proveedorId) await this.exigirProveedor(proveedorId);
    if (conceptoId) await this.exigirConcepto(conceptoId);
    if (documentoAfectadoId) await this.exigirFactura(documentoAfectadoId);
  }

  private async exigirProveedor(proveedorId: string): Promise<void> {
    const proveedor = await this.dependencias.proveedores.buscar(proveedorId);
    if (!proveedor) throw new RecursoNoEncontrado('El proveedor');
    if (!proveedor.activo) throw new ProveedorInactivo();
  }

  private async exigirConcepto(conceptoId: string): Promise<void> {
    const [concepto] = await this.dependencias.catalogos.conceptos([conceptoId]);
    if (!concepto) throw new RecursoNoEncontrado('El concepto de gasto');
    if (!concepto.activo) throw new CatalogoInactivo(`El concepto de gasto "${concepto.nombre}" está inactivo.`);
  }

  private async exigirFactura(facturaId: string): Promise<void> {
    if (!(await this.dependencias.consultas.buscarFacturaParaNota(facturaId, false))) {
      throw new RecursoNoEncontrado('La factura');
    }
  }
}
