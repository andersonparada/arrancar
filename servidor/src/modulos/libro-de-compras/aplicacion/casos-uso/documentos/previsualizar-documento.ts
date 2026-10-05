import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { DocumentoConAvisosDto } from '../../dto/documento.dto.js';
import { dtoDeDocumento } from './dto-de-documento.js';
import { PreparadorDeDocumento, type DependenciasDelPreparador } from './preparador-de-documento.js';
import type { PeticionDeRegistro } from './registrar-documento.js';

interface Dependencias extends DependenciasDelPreparador {
  unidadDeTrabajo: UnidadDeTrabajo;
}

/**
 * Vista previa de un documento (`POST …/documentos/calcular`): los mismos pasos de `RegistrarDocumento` hasta
 * el cálculo, sin guardar nada, con totales, retenciones propuestas y avisos. El formulario muestra lo que
 * responde, así el servidor es la única fuente del cálculo.
 */
export class PrevisualizarDocumento {
  private readonly preparador: PreparadorDeDocumento;

  constructor(private readonly dependencias: Dependencias) {
    this.preparador = new PreparadorDeDocumento(dependencias);
  }

  /** @throws las mismas reglas que `RegistrarDocumento`, salvo repetido, NIT del proveedor y destino. */
  ejecutar(operador: Operador, peticion: PeticionDeRegistro): Promise<DocumentoConAvisosDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const { documento, avisos } = await this.preparador.preparar(operador, peticion.solicitud, {
        bloquearFactura: false,
        puedeAjustarRetenciones: peticion.puedeAjustarRetenciones,
      });
      return { documento: dtoDeDocumento(documento, false), avisos };
    });
  }
}
