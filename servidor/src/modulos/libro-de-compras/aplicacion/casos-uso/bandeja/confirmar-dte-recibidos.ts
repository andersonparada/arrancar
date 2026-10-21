import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { ErrorEsperado } from '../../../../core/compartido/dominio/errores.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { esNota, FAMILIA_DEL_TIPO_DTE } from '../../../dominio/tipos-de-documento.js';
import type { DteRecibido } from '../../../dominio/dte-recibido.js';
import type { ResultadoDeConfirmacion, ResultadosDeConfirmacionDto } from '../../dto/dte-recibido.dto.js';
import type { RepositorioDeDteRecibidos } from '../../puertos/repositorio-de-dte-recibidos.js';
import type { ConfirmadorDeFila, OpcionesDelConfirmador } from './confirmador-de-fila.js';
import type { DatosFiscalesPorProveedor } from './decisiones-del-dte.js';
import type { ProponedorDeDte } from './proponedor-de-dte.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  filas: RepositorioDeDteRecibidos;
  confirmador: ConfirmadorDeFila;
  crearProponedor: (operador: Operador) => ProponedorDeDte;
  /** Convierte lo que la base rechazó (un valor repetido...) en un error esperado; `null` si no sabe. */
  interpretarError: (error: unknown) => ErrorEsperado | null;
}

export interface PeticionDeConfirmacion {
  ids: readonly string[];
  datosFiscalesPorProveedor: DatosFiscalesPorProveedor;
  /** El usuario tiene `proveedores.crear`. */
  puedeCrearProveedores: boolean;
}

/** Las facturas antes que sus notas del mismo día; lo demás conserva el orden de la fecha de emisión. */
const esNotaDelDte = (dte: DteRecibido): boolean => esNota(FAMILIA_DEL_TIPO_DTE[dte.instantanea().tipoDte]);

function enOrdenDeRegistro(filas: readonly DteRecibido[]): DteRecibido[] {
  return [...filas].sort(
    (a, b) =>
      a.instantanea().fechaEmision.localeCompare(b.instantanea().fechaEmision) ||
      Number(esNotaDelDte(a)) - Number(esNotaDelDte(b)),
  );
}

/**
 * Confirma hasta 100 filas de la bandeja, **fila por fila** y cada una en su propia transacción, con el mismo
 * `RegistrarDocumento` del formulario: una fila con error no frena a las demás. Las procesa por fecha de emisión (las
 * facturas antes que sus notas). Cada fila responde su documento y avisos, o su error.
 */
export class ConfirmarDteRecibidos {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(operador: Operador, peticion: PeticionDeConfirmacion): Promise<ResultadosDeConfirmacionDto> {
    const { unidadDeTrabajo, filas } = this.dependencias;
    const ids = [...new Set(peticion.ids)];
    const encontradas = await unidadDeTrabajo.ejecutar(operador, () => filas.buscarVarias(ids));
    const opciones: OpcionesDelConfirmador = {
      proponedor: this.dependencias.crearProponedor(operador),
      datosFiscalesPorProveedor: peticion.datosFiscalesPorProveedor,
      puedeCrearProveedores: peticion.puedeCrearProveedores,
    };
    const resultados: ResultadoDeConfirmacion[] = [];
    for (const fila of enOrdenDeRegistro(encontradas)) {
      resultados.push(await this.confirmarUna(operador, fila.instantanea().id.valor, opciones));
    }
    const hallados = new Set(encontradas.map((fila) => fila.instantanea().id.valor));
    const faltantes = ids
      .filter((id) => !hallados.has(id))
      .map((id) => resultadoDeError(id, new RecursoNoEncontrado('El DTE recibido')));
    return { resultados: [...resultados, ...faltantes] };
  }

  private async confirmarUna(operador: Operador, id: string, opciones: OpcionesDelConfirmador) {
    try {
      const { documentoId, avisos } = await this.dependencias.confirmador.confirmar(operador, id, opciones);
      return { id, documentoId, avisos };
    } catch (error) {
      const esperado = error instanceof ErrorEsperado ? error : this.dependencias.interpretarError(error);
      if (!esperado) throw error;
      return resultadoDeError(id, esperado);
    }
  }
}

function resultadoDeError(id: string, error: ErrorEsperado): ResultadoDeConfirmacion {
  return { id, error: { codigo: error.codigo, mensaje: error.message, detalles: error.detalles } };
}
