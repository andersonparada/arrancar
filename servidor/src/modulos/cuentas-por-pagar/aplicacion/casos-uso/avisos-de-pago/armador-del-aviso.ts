import type { MensajePorEncolar } from '../../../../core/correo/aplicacion/bandeja-de-salida.js';
import type { DestinatarioPorEncolar } from '../../../../core/correo/dominio/destinatarios-de-correo.js';
import { DireccionDeEnvio } from '../../../../core/correo/dominio/direccion-de-envio.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { fechaLegible, quetzales } from '../../../dominio/avisos.js';
import {
  MARCADORES_DEL_ASUNTO,
  MARCADORES_DEL_MENSAJE,
  FRASE_DEL_ADJUNTO,
  RECURSO_DE_AVISOS,
  TIPO_DE_AVISO,
  destinatariosPosibles,
  documentosEnTexto,
  motivoSinAviso,
  textoDeLaForma,
  type DestinatarioPosible,
} from '../../../dominio/aviso-de-pago.js';
import type { ComprobanteDePagoDto } from '../../dto/comprobante-de-pago.dto.js';
import {
  nombreDelPdfDelComprobante,
  type GeneradorDePdfDelComprobante,
} from '../../puertos/generador-de-pdf-del-comprobante.js';
import type {
  AjustesDelAviso,
  ComprobantesDePago,
  ConfiguracionDelAviso,
  CorreosDelProveedorDeTerceros,
  DatosDeLaEmpresaParaElAviso,
  EmpresaDelAviso,
} from '../../puertos/puertos-de-avisos-de-pago.js';

const SIN_CORREO_PARA_AVISOS = 'El proveedor no tiene un correo para avisos: agréguelo en sus contactos.';

/** Todo lo que hace falta saber de un pago para avisarle al proveedor, leído dentro de la unidad de trabajo en curso. */
export interface AvisoPreparado {
  comprobante: ComprobanteDePagoDto;
  ajustes: AjustesDelAviso;
  empresa: EmpresaDelAviso;
  posibles: DestinatarioPosible[];
  /** El correo de la empresa si sirve para enviar (copia visible y «Responder a»). */
  correoDeLaEmpresa: string | null;
  /** Por qué el pago no admite aviso; `null` si lo admite. */
  motivo: string | null;
  valores: Record<string, string>;
}

interface Dependencias {
  comprobantes: ComprobantesDePago;
  correos: CorreosDelProveedorDeTerceros;
  empresa: DatosDeLaEmpresaParaElAviso;
  configuracion: ConfiguracionDelAviso;
  generador: GeneradorDePdfDelComprobante;
}

function valoresDe(comprobante: ComprobanteDePagoDto, empresa: EmpresaDelAviso): Record<string, string> {
  const { pago } = comprobante;
  const documentos = comprobante.contrasenas.flatMap((contrasena) => contrasena.documentos);
  return {
    proveedor: comprobante.proveedor.nombre,
    empresa: empresa.nombre,
    numero: pago.numero,
    fecha: fechaLegible(pago.fecha),
    forma: textoDeLaForma(pago.forma),
    monto: quetzales(aCentavos(comprobante.totalPagado)),
    documentos: documentosEnTexto(documentos),
    fecha_de_cobro: pago.posfechado ? fechaLegible(pago.fecha) : '',
  };
}

function correoUtilizable(correo: string | null): string | null {
  return correo !== null && DireccionDeEnvio.esUtilizable(correo) ? correo : null;
}

/** Junta lo que los avisos de pago necesitan, para mostrarlo (vista previa) y para armar el correo. */
export class ArmadorDelAviso {
  constructor(private readonly dependencias: Dependencias) {}

  async preparar(operador: Operador, pagoId: string): Promise<AvisoPreparado> {
    const { comprobantes, correos, empresa: datosDeLaEmpresa, configuracion } = this.dependencias;
    const comprobante = await comprobantes.ejecutar(operador, pagoId);
    const [ajustes, empresa, delProveedor] = await Promise.all([
      configuracion.de(operador),
      datosDeLaEmpresa.obtener(operador),
      correos.obtener(operador, comprobante.proveedor.id),
    ]);
    const posibles = destinatariosPosibles(delProveedor);
    const sinCorreo = posibles.some((p) => p.utilizable) ? null : SIN_CORREO_PARA_AVISOS;
    return {
      comprobante,
      ajustes,
      empresa,
      posibles,
      correoDeLaEmpresa: correoUtilizable(empresa.correo),
      motivo: motivoSinAviso(comprobante.pago) ?? sinCorreo,
      valores: { ...valoresDe(comprobante, empresa), adjunto: ajustes.adjuntarComprobante ? FRASE_DEL_ADJUNTO : '' },
    };
  }

  /** El mensaje para la bandeja de core: plantilla de la empresa, destinatarios ya registrados y el PDF si se adjunta. */
  async mensaje(
    operador: Operador,
    preparado: AvisoPreparado,
    elegidos: { destinatarios: readonly DestinatarioPosible[]; conCopia: boolean },
  ): Promise<MensajePorEncolar> {
    const { ajustes, comprobante, correoDeLaEmpresa, empresa } = preparado;
    const correoDeCopia = elegidos.conCopia ? correoDeLaEmpresa : null;
    return {
      tipo: TIPO_DE_AVISO,
      origen: { recurso: RECURSO_DE_AVISOS, registroId: comprobante.pago.id },
      empresa: empresa.nombre,
      responderA: correoDeLaEmpresa,
      destinatarios: [
        ...elegidos.destinatarios.map(aPara),
        ...(correoDeCopia ? [aCopia(correoDeCopia, empresa.nombre)] : []),
      ],
      plantilla: plantillaDe(preparado),
      adjunto: ajustes.adjuntarComprobante ? await this.adjunto(comprobante) : null,
    };
  }

  private async adjunto(comprobante: ComprobanteDePagoDto) {
    return {
      nombre: nombreDelPdfDelComprobante(comprobante.pago.numero),
      contenido: await this.dependencias.generador.generar(comprobante),
    };
  }
}

const plantillaDe = ({ ajustes, valores }: AvisoPreparado) => ({
  asunto: ajustes.asunto,
  mensaje: ajustes.mensaje,
  marcadoresDelAsunto: MARCADORES_DEL_ASUNTO,
  marcadoresDelMensaje: MARCADORES_DEL_MENSAJE,
  valores,
});

const aPara = (posible: DestinatarioPosible): DestinatarioPorEncolar => ({
  direccion: posible.direccion,
  nombre: posible.nombre,
  clase: 'para',
  origen: posible.origen,
  origenId: posible.origenId,
});

const aCopia = (direccion: string, nombre: string): DestinatarioPorEncolar => ({
  direccion,
  nombre,
  clase: 'copia',
  origen: 'empresa',
  origenId: null,
});
