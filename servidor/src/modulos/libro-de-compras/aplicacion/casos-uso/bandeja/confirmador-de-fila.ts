import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { exigirConfirmable } from '../../../dominio/confirmabilidad-del-dte.js';
import type { DteRecibido } from '../../../dominio/dte-recibido.js';
import { DteRegistradoEnOtraEmpresa } from '../../../dominio/errores-de-bandeja.js';
import type { CatalogosParaDocumentos } from '../../puertos/puertos-de-documentos.js';
import type { AutorizacionesRegistradasFuera } from '../../puertos/puertos-de-la-bandeja.js';
import type { RepositorioDeDteRecibidos } from '../../puertos/repositorio-de-dte-recibidos.js';
import type { RepositorioDeLotesDeDte } from '../../puertos/repositorio-de-lotes-de-dte.js';
import type { PeticionDeRegistro, RegistrarDocumento } from '../documentos/registrar-documento.js';
import type { ArmadorDeSolicitudDelDte } from './armador-de-solicitud-del-dte.js';
import {
  exigirCompleto,
  solicitudCompleta,
  type DatosFiscalesPorProveedor,
  type ProveedoresNuevosPorNit,
} from './decisiones-del-dte.js';
import type { ProponedorDeDte } from './proponedor-de-dte.js';
import type { ProveedorDeLaFila } from './proveedor-de-la-fila.js';
import { MARCA_DE_MONTOS_DE_LA_SAT } from './solicitud-desde-el-dte.js';

export interface DependenciasDelConfirmador {
  unidadDeTrabajo: UnidadDeTrabajo;
  filas: RepositorioDeDteRecibidos;
  lotes: RepositorioDeLotesDeDte;
  autorizaciones: AutorizacionesRegistradasFuera;
  proveedorDeLaFila: ProveedorDeLaFila;
  armador: ArmadorDeSolicitudDelDte;
  catalogos: CatalogosParaDocumentos;
  registrar: RegistrarDocumento;
}

/** Lo que cambia de una solicitud a otra: quién confirma y cómo se proponen las filas. */
export interface OpcionesDelConfirmador {
  proponedor: ProponedorDeDte;
  datosFiscalesPorProveedor: DatosFiscalesPorProveedor;
  /** Lo que el usuario confirmó de los proveedores que se crearán, por NIT del emisor. */
  proveedoresNuevos: ProveedoresNuevosPorNit;
  /** El usuario tiene `proveedores.crear`. */
  puedeCrearProveedores: boolean;
}

/** Una fila lista para registrar y los avisos de lo que se dedujo de su resumen. */
interface FilaPreparada {
  peticion: PeticionDeRegistro;
  avisos: string[];
}

/**
 * Confirma una fila de la bandeja: la revisa y prepara su solicitud en una transacción (bloqueada la fila, creado el
 * proveedor nuevo) y la registra con `RegistrarDocumento` en la suya, que también enlaza la fila con su documento.
 * Cada fila falla o se registra sola; el proveedor creado queda aunque el registro falle.
 */
export class ConfirmadorDeFila {
  constructor(private readonly dependencias: DependenciasDelConfirmador) {}

  /**
   * @returns el documento registrado y sus avisos, sin repetir los iguales (cada línea de la factura puede traer el mismo).
   * @throws RecursoNoEncontrado, DteRegistradoEnOtraEmpresa y cualquier regla de la fila o del registro.
   */
  async confirmar(
    operador: Operador,
    id: string,
    opciones: OpcionesDelConfirmador,
  ): Promise<{ documentoId: string; avisos: string[] }> {
    const { unidadDeTrabajo, registrar } = this.dependencias;
    const bloqueada = await unidadDeTrabajo.ejecutar(operador, () => this.revisarBloqueo(id));
    if (bloqueada) throw new DteRegistradoEnOtraEmpresa();
    const preparada = await unidadDeTrabajo.ejecutar(operador, () => this.preparar(operador, id, opciones));
    const registrado = await registrar.ejecutar(operador, preparada.peticion);
    const avisos = [...new Set([...preparada.avisos, ...registrado.avisos])];
    return { documentoId: registrado.documento.id!, avisos };
  }

  /**
   * Una fila pendiente cuyo DTE ya está registrado en otra empresa de la cuenta queda bloqueada, y una bloqueada cuya
   * otra empresa lo soltó vuelve a pendiente. @returns `true` si queda bloqueada.
   */
  private async revisarBloqueo(id: string): Promise<boolean> {
    const { filas, autorizaciones } = this.dependencias;
    const fila = await this.bloquear(id);
    const { estado, autorizacionFel } = fila.instantanea();
    if (estado !== 'pendiente' && estado !== 'bloqueado') return false;
    const fuera = await autorizaciones.estaRegistrada(autorizacionFel);
    if (fuera === (estado === 'bloqueado')) return fuera;
    if (fuera) fila.bloquear('registrado_en_otra_empresa');
    else fila.devolverAPendiente();
    await filas.guardar(fila);
    return fuera;
  }

  private async preparar(operador: Operador, id: string, opciones: OpcionesDelConfirmador): Promise<FilaPreparada> {
    const fila = await this.bloquear(id);
    const lote = await this.dependencias.lotes.buscar(fila.instantanea().loteId);
    exigirConfirmable(fila, lote?.encabezadosNoReconocidos ?? []);
    const { decisiones, solicitud, avisos } = await this.dependencias.armador.armar(operador, fila, opciones);
    const completas = exigirCompleto(fila, decisiones);
    const { proveedorId } = await this.dependencias.proveedorDeLaFila.resolver(operador, fila, {
      ...opciones,
      decisiones,
      exigirConfirmado: true,
    });
    const avisoDeTipo = await this.avisoDeTipo(solicitud.lineas[0]?.tipo ?? null, completas.conceptoId);
    return {
      peticion: {
        solicitud: solicitudCompleta(solicitud, { ...completas, proveedorId }),
        puedeAjustarRetenciones: false,
      },
      avisos: [MARCA_DE_MONTOS_DE_LA_SAT, ...avisos, ...avisoDeTipo],
    };
  }

  /** El Excel no dice si es un bien o un servicio: se usa el del concepto y se avisa. */
  private async avisoDeTipo(tipo: 'bien' | 'servicio' | null, conceptoId: string): Promise<string[]> {
    if (tipo !== null) return [];
    const [concepto] = await this.dependencias.catalogos.conceptos([conceptoId]);
    if (!concepto) return [];
    return [
      `La SAT no dice si es un bien o un servicio: se usó «${concepto.tipoPorOmision}», el de «${concepto.nombre}».`,
    ];
  }

  private async bloquear(id: string): Promise<DteRecibido> {
    const fila = await this.dependencias.filas.bloquear(Identificador.desde<'DteRecibido'>(id));
    if (!fila) throw new RecursoNoEncontrado('El DTE recibido');
    return fila;
  }
}
