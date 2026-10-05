import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { DestinoDto, DestinoSugeridoDto } from '../../dto/documento.dto.js';
import type {
  ConsultasDeDocumentos,
  DestinosDeDocumentos,
  ProveedoresParaDocumentos,
} from '../../puertos/puertos-de-documentos.js';

/** Los destinos a donde se puede mandar un documento: los que tienen su módulo activo en la cuenta. */
export class ListarDestinos {
  constructor(private readonly dependencias: { destinos: DestinosDeDocumentos }) {}

  /** Hoy ninguno está instalado: devuelve una lista vacía. */
  async ejecutar(operador: Operador): Promise<DestinoDto[]> {
    const activos = await this.dependencias.destinos.activos(operador);
    return activos.map((clave) => ({ clave }));
  }
}

interface DependenciasDelDestinoSugerido {
  unidadDeTrabajo: UnidadDeTrabajo;
  proveedores: ProveedoresParaDocumentos;
  consultas: ConsultasDeDocumentos;
  destinos: DestinosDeDocumentos;
}

/** El destino del último documento que la empresa registró con ese proveedor, para proponerlo en el formulario. */
export class ObtenerDestinoSugerido {
  constructor(private readonly dependencias: DependenciasDelDestinoSugerido) {}

  /**
   * Devuelve `null` si el proveedor es nuevo para la empresa o si ese destino ya no está activo.
   * @throws RecursoNoEncontrado si el proveedor no es de la cuenta.
   */
  ejecutar(operador: Operador, proveedorId: string): Promise<DestinoSugeridoDto> {
    const { unidadDeTrabajo, proveedores, consultas, destinos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (!(await proveedores.buscar(proveedorId))) throw new RecursoNoEncontrado('El proveedor');
      const ultimo = await consultas.ultimoDestinoDelProveedor(proveedorId);
      const activos = await destinos.activos(operador);
      return { destino: ultimo && activos.includes(ultimo) ? ultimo : null };
    });
  }
}
