import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { CLAVE_DE_CONTRASENAS } from '../../../dominio/contrasena.js';
import {
  exigirAlMenosUnCargo,
  exigirDocumentosPedidos,
  exigirFechaDeContrasena,
  exigirFechaDePago,
  observacionesDeContrasena,
} from '../../../dominio/reglas-de-contrasena.js';
import type { ContrasenaDto } from '../../dto/contrasena.dto.js';
import type { FilaDeDocumento } from '../../puertos/puertos-de-consultas.js';
import { contrasenaComoDto, type DependenciasParaCrearContrasena } from './dependencias-de-contrasenas.js';
import { bloquearEnOrden, exigirDisponibles, leerDocumentos, repartirNotas } from './documentos-de-la-contrasena.js';

export interface PeticionDeContrasena {
  proveedorId: string;
  /** `AAAA-MM-DD`; hoy si falta. */
  fecha?: string;
  fechaDePago: string;
  observaciones?: string | null;
  /** Los ids (de Cuentas por pagar) de los cargos y las notas, de 1 a 100 y sin repetir. */
  documentos: string[];
}

/**
 * Crea una contraseña de pago con documentos de un proveedor, en una sola transacción. Pide la carga inicial (bloqueo
 * compartido) antes de bloquear nada, luego bloquea los documentos en orden de id, valida, reparte las notas entre los
 * cargos y por último pide el número correlativo, para no gastarlo si algo falla. Es un alta: no audita ni publica.
 */
export class CrearContrasena {
  constructor(private readonly dependencias: DependenciasParaCrearContrasena) {}

  /**
   * @throws RecursoNoEncontrado si el proveedor o un documento no existen.
   * @throws ContrasenaSinCargos, DemasiadosDocumentosEnContrasena, DocumentosRepetidosEnContrasena,
   * DocumentoDeOtroProveedor, DocumentoNoDisponibleParaContrasena, DocumentoYaEnContrasena,
   * FechaDeContrasenaInvalida, FechaDePagoInvalida, ObservacionesDeContrasenaInvalidas, ContrasenaSinSaldo
   */
  ejecutar(operador: Operador, pedido: PeticionDeContrasena): Promise<ContrasenaDto> {
    const { unidadDeTrabajo, cargaInicial, repositorio, correlativos } = this.dependencias;
    exigirDocumentosPedidos(pedido.documentos);
    const observaciones = observacionesDeContrasena(pedido.observaciones);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { fechaDeInicio } = await cargaInicial.obtener(operador);
      await this.exigirProveedor(pedido.proveedorId);
      const filas = await this.cargarDocumentos(pedido);
      const fecha = await this.fechaValida(operador, pedido, { filas, fechaDeInicio });
      const reparto = await repartirNotas(this.dependencias, { fecha, filas, fechaDeInicio });
      const { numero, anio } = await correlativos.siguiente(CLAVE_DE_CONTRASENAS, fecha);
      const id = await repositorio.agregar({
        proveedorId: pedido.proveedorId,
        numero,
        anioDeNumero: anio,
        fecha,
        fechaDePago: pedido.fechaDePago,
        observaciones,
        documentoIds: pedido.documentos,
      });
      await repositorio.guardarReparto(id, pedido.proveedorId, reparto.aplicaciones);
      return contrasenaComoDto(this.dependencias, operador, id);
    });
  }

  private async exigirProveedor(proveedorId: string): Promise<void> {
    if (!(await this.dependencias.proveedores.existe(proveedorId))) throw new RecursoNoEncontrado('El proveedor');
  }

  /** Bloquea los documentos en orden de id y devuelve sus filas, en el orden pedido, ya validadas. */
  private async cargarDocumentos({ proveedorId, documentos: ids }: PeticionDeContrasena): Promise<FilaDeDocumento[]> {
    await bloquearEnOrden(this.dependencias, ids);
    const filas = await leerDocumentos(this.dependencias, ids);
    await exigirDisponibles(this.dependencias, { proveedorId, filas });
    exigirAlMenosUnCargo(filas.map(({ documento }) => documento));
    return filas;
  }

  private async fechaValida(
    operador: Operador,
    pedido: PeticionDeContrasena,
    { filas, fechaDeInicio }: { filas: FilaDeDocumento[]; fechaDeInicio: string | null },
  ): Promise<string> {
    const hoy = await this.dependencias.reloj.hoy(operador);
    const fecha = pedido.fecha ?? hoy;
    const emisiones = filas.map(({ documento }) => documento.fechaEmision);
    exigirFechaDeContrasena(fecha, { hoy, emisiones, fechaDeInicio });
    exigirFechaDePago(pedido.fechaDePago, fecha);
    return fecha;
  }
}
