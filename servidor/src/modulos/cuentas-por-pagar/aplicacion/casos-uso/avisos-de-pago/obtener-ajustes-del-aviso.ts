import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { ASUNTO_DEL_AVISO_POR_OMISION, MENSAJE_DEL_AVISO_POR_OMISION } from '../../../configuracion-de-avisos.js';
import { MARCADORES_DEL_ASUNTO, MARCADORES_DEL_MENSAJE } from '../../../dominio/aviso-de-pago.js';
import type { AjustesDelAvisoDto } from '../../dto/ajustes-del-aviso.dto.js';
import type { ConfiguracionDelAviso } from '../../puertos/puertos-de-avisos-de-pago.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  configuracion: ConfiguracionDelAviso;
}

/** Los ajustes de los avisos de pago de la empresa (`avisos-de-pago.configurar`), para la pantalla «Avisos de pago». */
export class ObtenerAjustesDelAviso {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador): Promise<AjustesDelAvisoDto> {
    const { unidadDeTrabajo, configuracion } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => ({
      ...(await configuracion.de(operador)),
      marcadoresDelAsunto: MARCADORES_DEL_ASUNTO,
      marcadoresDelMensaje: MARCADORES_DEL_MENSAJE,
      asuntoPorOmision: ASUNTO_DEL_AVISO_POR_OMISION,
      mensajePorOmision: MENSAJE_DEL_AVISO_POR_OMISION,
    }));
  }
}
