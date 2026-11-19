import type { BandejaDeSalida } from '../../../../core/correo/aplicacion/bandeja-de-salida.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { PlantillaDeCorreo } from '../../../../core/correo/dominio/plantilla-de-correo.js';
import { MARCADORES_DEL_ASUNTO, MARCADORES_DEL_MENSAJE, RECURSO_DE_AVISOS } from '../../../dominio/aviso-de-pago.js';
import type { AvisoDePagoDto } from '../../dto/aviso-de-pago.dto.js';
import { nombreDelPdfDelComprobante } from '../../puertos/generador-de-pdf-del-comprobante.js';
import type { ArmadorDelAviso, AvisoPreparado } from './armador-del-aviso.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  armador: ArmadorDelAviso;
  bandeja: BandejaDeSalida;
}

function vistaPreviaDe({ ajustes, valores, comprobante }: AvisoPreparado): AvisoDePagoDto['vistaPrevia'] {
  return {
    asunto: PlantillaDeCorreo.crear(ajustes.asunto, MARCADORES_DEL_ASUNTO).aplicar(valores),
    mensaje: PlantillaDeCorreo.crear(ajustes.mensaje, MARCADORES_DEL_MENSAJE).aplicar(valores),
    adjuntoNombre: ajustes.adjuntarComprobante ? nombreDelPdfDelComprobante(comprobante.pago.numero) : null,
  };
}

/**
 * Lo que la ventana «Enviar aviso» muestra de un pago (`pagos.ver`): destinatarios registrados con su marca, la copia a
 * la empresa, cómo quedaría el mensaje y los avisos que ya salieron. No cambia nada.
 */
export class PrepararAvisoDePago {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si el pago no existe o es de otra empresa. */
  ejecutar(operador: Operador, pagoId: string): Promise<AvisoDePagoDto> {
    const { unidadDeTrabajo, armador, bandeja } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const preparado = await armador.preparar(operador, pagoId);
      return {
        envio: preparado.ajustes.envio,
        posibles: preparado.posibles,
        copiaALaEmpresa: preparado.correoDeLaEmpresa,
        copiaPorOmision: preparado.ajustes.copiaALaEmpresa,
        vistaPrevia: vistaPreviaDe(preparado),
        enviados: await bandeja.deRegistro(operador, { recurso: RECURSO_DE_AVISOS, registroId: pagoId }),
        sePuedeEnviar: preparado.motivo === null,
        motivoSinAviso: preparado.motivo,
      };
    });
  }
}
