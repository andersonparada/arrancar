import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { MAXIMO_DE_DOCUMENTOS_EN_CONTRASENA } from '../../../dominio/contrasena.js';
import { DemasiadosDocumentosEnContrasena } from '../../../dominio/errores-de-contrasenas.js';
import { exigirDocumentosPedidos, exigirFechaDeContrasena } from '../../../dominio/reglas-de-contrasena.js';
import type { ContrasenaDto } from '../../dto/contrasena.dto.js';
import type { ContrasenaGuardada } from '../../puertos/puertos-de-contrasenas.js';
import {
  abrirContrasena,
  contrasenaComoDto,
  type DependenciasParaCambiarDocumentos,
} from './dependencias-de-contrasenas.js';
import { bloquearEnOrden, exigirDisponibles, leerDocumentos } from './documentos-de-la-contrasena.js';
import { rehacerElReparto } from './rehacer-el-reparto.js';

export interface PeticionParaAgregarDocumentos {
  contrasenaId: string;
  /** Los ids (de Cuentas por pagar) de los cargos y las notas que se suman, sin repetir. */
  documentos: string[];
}

/**
 * Suma cargos o notas del mismo proveedor a una contraseña vigente, con las mismas validaciones que al crearla, y rehace
 * el reparto de sus notas. No se audita: es un alta (queda `actualizado_por`). Si la contraseña ya se imprimió, la
 * pantalla avisa de la «REIMPRESIÓN» antes de llamar aquí.
 */
export class AgregarDocumentosAContrasena {
  constructor(private readonly dependencias: DependenciasParaCambiarDocumentos) {}

  /**
   * @throws RecursoNoEncontrado, ContrasenaAnulada
   * @throws ContrasenaSinCargos, DemasiadosDocumentosEnContrasena, DocumentosRepetidosEnContrasena
   * @throws DocumentoDeOtroProveedor, DocumentoNoDisponibleParaContrasena, DocumentoYaEnContrasena
   * @throws FechaDeContrasenaInvalida si algún documento nuevo se emitió después de la fecha de la contraseña.
   * @throws ContrasenaSinSaldo si las notas cubrirían todo lo que se debe.
   */
  async ejecutar(
    operador: Operador,
    { contrasenaId, documentos }: PeticionParaAgregarDocumentos,
  ): Promise<ContrasenaDto> {
    const { unidadDeTrabajo, cargaInicial, repositorio } = this.dependencias;
    exigirDocumentosPedidos(documentos);
    return await unidadDeTrabajo.ejecutar(operador, async () => {
      const { fechaDeInicio } = await cargaInicial.obtener(operador);
      const { detalle } = await abrirContrasena(this.dependencias, operador, contrasenaId);
      const { proveedorId, fecha } = detalle.contrasena;
      const actuales = detalle.documentos.map(({ documento }) => documento.id);
      await this.exigirNuevos(operador, { contrasena: detalle.contrasena, actuales, documentos, fechaDeInicio });
      await repositorio.agregarDocumentos(contrasenaId, proveedorId, documentos);
      const documentoIds = [...actuales, ...documentos];
      await rehacerElReparto(this.dependencias, { contrasenaId, proveedorId, fecha, fechaDeInicio, documentoIds });
      return contrasenaComoDto(this.dependencias, operador, contrasenaId);
    });
  }

  /** Bloquea todo lo que quedará en la contraseña y revisa que los documentos nuevos puedan entrar. */
  private async exigirNuevos(
    operador: Operador,
    datos: {
      contrasena: ContrasenaGuardada;
      actuales: readonly string[];
      documentos: readonly string[];
      fechaDeInicio: string | null;
    },
  ): Promise<void> {
    const { contrasena, actuales, documentos, fechaDeInicio } = datos;
    if (actuales.length + documentos.length > MAXIMO_DE_DOCUMENTOS_EN_CONTRASENA) {
      throw new DemasiadosDocumentosEnContrasena(MAXIMO_DE_DOCUMENTOS_EN_CONTRASENA);
    }
    await bloquearEnOrden(this.dependencias, [...actuales, ...documentos]);
    const filas = await leerDocumentos(this.dependencias, documentos);
    await exigirDisponibles(this.dependencias, { proveedorId: contrasena.proveedorId, filas });
    const hoy = await this.dependencias.reloj.hoy(operador);
    const emisiones = filas.map(({ documento }) => documento.fechaEmision);
    exigirFechaDeContrasena(contrasena.fecha, { hoy, emisiones, fechaDeInicio });
  }
}
