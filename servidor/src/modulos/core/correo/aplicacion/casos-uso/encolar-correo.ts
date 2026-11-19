import { randomUUID } from 'node:crypto';
import type { DocumentosProtegidos } from '../../../compartido/aplicacion/documentos-protegidos.js';
import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { TareasDeLaTransaccion } from '../../../compartido/aplicacion/tareas-de-la-transaccion.js';
import { armarContenido, validarAdjunto, type AdjuntoValidado } from '../../dominio/contenido-de-correo.js';
import { verificarCupos } from '../../dominio/cupos-de-correo.js';
import { normalizarDestinatarios, type Destinatario } from '../../dominio/destinatarios-de-correo.js';
import { DireccionDeEnvio } from '../../dominio/direccion-de-envio.js';
import { AdjuntoNoValido } from '../../dominio/errores-de-la-bandeja.js';
import type { BandejaDeSalida, CorreoEncoladoDto, MensajePorEncolar } from '../bandeja-de-salida.js';
import type { ParametrosDeCorreo } from '../puertos/parametros-de-correo.js';
import type { Despertador } from '../puertos/despertador.js';
import type { RepositorioDeCorreos } from '../puertos/repositorio-de-correos.js';

/** Recurso dueño de los PDF adjuntos en `core.archivos`: solo el trabajador los lee. */
export const RECURSO_DE_ADJUNTOS = 'core.correos_salientes';

interface Dependencias {
  repositorio: RepositorioDeCorreos;
  documentos: DocumentosProtegidos;
  parametros: ParametrosDeCorreo;
  tareas: TareasDeLaTransaccion;
  despertador: Despertador;
  /** Dominio de los `Message-ID` (el de la URL pública de la instalación). */
  dominioDeMensajes: string;
}

function responderASiSirve(responderA: string | null): DireccionDeEnvio | null {
  return responderA !== null && DireccionDeEnvio.esUtilizable(responderA) ? DireccionDeEnvio.crear(responderA) : null;
}

/**
 * Encola un correo en la unidad de trabajo en curso: lo valida, cuenta los cupos con el candado de la cuenta, guarda
 * el adjunto y inserta el correo. Si la transacción se deshace, no queda ni el correo ni el archivo.
 */
export class EncolarCorreo {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(operador: Operador, mensaje: MensajePorEncolar): Promise<CorreoEncoladoDto> {
    const { repositorio, parametros } = this.dependencias;
    const destinatarios = normalizarDestinatarios(mensaje.destinatarios);
    const responderA = responderASiSirve(mensaje.responderA);
    const aplicacion = await parametros.nombreDeLaAplicacion();
    const contenido = armarContenido(mensaje.plantilla, {
      empresa: mensaje.empresa,
      aplicacion,
      conRespuesta: responderA !== null,
    });
    const adjunto = mensaje.adjunto && validarAdjunto(mensaje.adjunto.nombre, mensaje.adjunto.contenido);
    await this.exigirCupo(destinatarios);
    const id = await repositorio.insertar({
      tipo: mensaje.tipo,
      origen: mensaje.origen,
      ...contenido,
      responderA: responderA?.valor ?? null,
      messageId: `<${randomUUID()}@${this.dependencias.dominioDeMensajes}>`,
      destinatarios,
      adjunto: adjunto ? await this.guardarAdjunto(operador, adjunto) : null,
    });
    await this.despertarAlConfirmar();
    return { id, estado: 'pendiente', asunto: contenido.asunto, destinatarios: aDestinatariosDto(destinatarios) };
  }

  private async exigirCupo(destinatarios: readonly Destinatario[]): Promise<void> {
    const direcciones = destinatarios.map((d) => d.direccion.valor);
    const [uso, topes] = await Promise.all([
      this.dependencias.repositorio.reservarCupo(direcciones),
      this.dependencias.parametros.topes(),
    ]);
    verificarCupos(uso, topes, direcciones);
  }

  private async guardarAdjunto(operador: Operador, adjunto: AdjuntoValidado) {
    const guardado = await this.dependencias.documentos.guardar(operador, adjunto.contenido, {
      nombre: adjunto.nombre,
      recursoDueno: RECURSO_DE_ADJUNTOS,
    });
    if (guardado.tipoMime !== 'application/pdf') throw new AdjuntoNoValido('solo se aceptan PDF.');
    return { archivoId: guardado.id, nombre: adjunto.nombre, sha256: guardado.sha256 };
  }

  private despertarAlConfirmar(): Promise<void> {
    const { tareas, despertador } = this.dependencias;
    return tareas.despuesDeConfirmar(async () => despertador.despertar(), 'despertar la bandeja de correo');
  }
}

const aDestinatariosDto = (destinatarios: readonly Destinatario[]) =>
  destinatarios.map((d) => ({ direccion: d.direccion.valor, clase: d.clase }));

/** El puerto público de core: delega en `EncolarCorreo`. */
export class BandejaDeSalidaDeCore implements BandejaDeSalida {
  constructor(private readonly encolarCorreo: EncolarCorreo) {}

  encolar(operador: Operador, mensaje: MensajePorEncolar): Promise<CorreoEncoladoDto> {
    return this.encolarCorreo.ejecutar(operador, mensaje);
  }
}
