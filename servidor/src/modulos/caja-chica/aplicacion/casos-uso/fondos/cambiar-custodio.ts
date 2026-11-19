import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { CustodioInvalido, FechaDelCustodioInvalida } from '../../../dominio/errores-de-fondos.js';
import { CustodioCambiado } from '../../../dominio/eventos-de-fondos.js';
import { RECURSO_DE_FONDOS, type Fondo } from '../../../dominio/fondos.js';
import { exigirFechaNoFutura, exigirFondoAbierto, nombreDelCustodio } from '../../../dominio/reglas-del-fondo.js';
import type { FondoDto } from '../../dto/fondos.dto.js';
import type { DependenciasDeFondos } from './dependencias-de-fondos.js';
import { custodioVigente, LectorDelFondo } from './lector-del-fondo.js';

/** El nuevo custodio: un nombre o un usuario de la empresa (que recibe el acceso al fondo). */
export interface PeticionDeCustodio {
  fondoId: string;
  custodio?: string | null;
  custodioUsuarioId?: string | null;
  /** Desde cuándo; hoy si falta. */
  fecha?: string;
  motivo: string;
}

interface Custodio {
  nombre: string;
  usuarioId: string | null;
}

/**
 * Cambia quién lleva el efectivo del fondo (`fondos.editar`): cierra el tramo del custodio vigente (`hasta` = fecha) y
 * abre el del nuevo. Si el nuevo es un usuario de la empresa, la base le da acceso al fondo; el anterior lo conserva (se
 * quita en la ventana de asignación). Audita `corregir` con el fondo como estaba y publica `custodio_cambiado`.
 */
export class CambiarCustodio {
  private readonly lector: LectorDelFondo;

  constructor(private readonly dependencias: DependenciasDeFondos) {
    this.lector = new LectorDelFondo(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado, FondoNoDisponible, FechaDelFondoInvalida, FechaDelCustodioInvalida, CustodioObligatorio,
   * CustodioInvalido
   */
  async ejecutar(operador: Operador, pedido: PeticionDeCustodio): Promise<FondoDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, evento } = await unidadDeTrabajo.ejecutar(operador, () => this.cambiar(operador, pedido));
    await publicadorEventos.publicar([evento]);
    return dto;
  }

  private async cambiar(operador: Operador, pedido: PeticionDeCustodio) {
    const { fondos } = this.dependencias;
    const fondo = await this.lector.bloquear(pedido.fondoId);
    exigirFondoAbierto(fondo);
    const fecha = await this.fechaDelCambio(operador, { fondo, pedido });
    const vigente = custodioVigente(await fondos.custodios(fondo.id));
    if (vigente && fecha < vigente.desde) throw new FechaDelCustodioInvalida(vigente.desde);
    const nuevo = await this.nuevoCustodio(pedido);
    await this.auditar(fondo, pedido);
    await this.relevar({ fondoId: fondo.id, fecha, nuevo, motivo: pedido.motivo.trim() });
    const evento = new CustodioCambiado({
      empresaId: operador.empresaId,
      fondoId: fondo.id,
      fecha,
      custodioAnterior: vigente?.custodio ?? '',
      custodio: nuevo.nombre,
      custodioUsuarioId: nuevo.usuarioId,
      motivo: pedido.motivo.trim(),
    });
    return { dto: await this.lector.leer(fondo), evento };
  }

  /** Cierra el tramo del custodio vigente y abre el del nuevo. */
  private async relevar(por: { fondoId: string; fecha: string; nuevo: Custodio; motivo: string }): Promise<void> {
    const { fondos } = this.dependencias;
    await fondos.cerrarCustodioVigente(por.fondoId, por.fecha);
    await fondos.agregarCustodio({
      fondoId: por.fondoId,
      custodio: por.nuevo.nombre,
      custodioUsuarioId: por.nuevo.usuarioId,
      desde: por.fecha,
      motivoDelCambio: por.motivo,
    });
  }

  private async fechaDelCambio(operador: Operador, por: { fondo: Fondo; pedido: PeticionDeCustodio }): Promise<string> {
    const hoy = await this.dependencias.reloj.hoy(operador);
    const fecha = por.pedido.fecha ?? hoy;
    exigirFechaNoFutura(fecha, hoy);
    return fecha;
  }

  /** Audita `corregir` con el fondo como estaba antes del cambio. */
  private async auditar(fondo: Fondo, pedido: PeticionDeCustodio): Promise<void> {
    await this.dependencias.auditoria.registrar({
      recurso: RECURSO_DE_FONDOS,
      registroId: fondo.id,
      accion: 'corregir',
      anterior: await this.lector.leer(fondo),
      motivo: pedido.motivo,
    });
  }

  private async nuevoCustodio(pedido: PeticionDeCustodio): Promise<Custodio> {
    const usuarioId = pedido.custodioUsuarioId ?? null;
    const delUsuario = usuarioId === null ? null : await this.dependencias.custodios.nombreDelUsuario(usuarioId);
    if (usuarioId !== null && delUsuario === null) throw new CustodioInvalido();
    return { nombre: nombreDelCustodio(pedido.custodio, delUsuario), usuarioId };
  }
}
