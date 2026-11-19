import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { RECURSO_DE_FONDOS, type Fondo } from '../../../dominio/fondos.js';
import { exigirFondoAbierto, exigirNombreDelFondo, exigirTope } from '../../../dominio/reglas-del-fondo.js';
import type { FondoDto } from '../../dto/fondos.dto.js';
import { NombreDeFondoRepetido } from '../../errores-de-fondos.js';
import type { CambiosDelFondo } from '../../puertos/puertos-de-fondos.js';
import type { DependenciasDeFondos } from './dependencias-de-fondos.js';
import { LectorDelFondo } from './lector-del-fondo.js';

/** Lo que no viene no se toca; `null` limpia la localidad, el tope (vuelve el de la empresa) o la cuenta. */
export interface PeticionDeEdicion {
  fondoId: string;
  nombre?: string;
  localidadId?: string | null;
  topePorComprobante?: string | null;
  cuentaBancariaId?: string | null;
  /** Por qué se cambia el tope; queda en la auditoría. */
  motivo?: string | null;
}

/**
 * Edita el nombre, la localidad, el tope por comprobante y la cuenta de un fondo abierto (`fondos.editar`). Solo si
 * cambia el tope audita `corregir`, con el fondo como estaba.
 */
export class EditarFondo {
  private readonly lector: LectorDelFondo;

  constructor(private readonly dependencias: DependenciasDeFondos) {
    this.lector = new LectorDelFondo(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado, FondoNoDisponible, NombreDelFondoInvalido, NombreDeFondoRepetido, TopeDelFondoInvalido
   */
  ejecutar(operador: Operador, pedido: PeticionDeEdicion): Promise<FondoDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, () => this.editar(pedido));
  }

  private async editar(pedido: PeticionDeEdicion): Promise<FondoDto> {
    const { fondos } = this.dependencias;
    const fondo = await this.lector.bloquear(pedido.fondoId);
    exigirFondoAbierto(fondo);
    const cambios = await this.cambiosValidos(fondo, pedido);
    if (cambios.topeCentavos !== undefined && cambios.topeCentavos !== fondo.topeCentavos) {
      await this.auditarElTope(fondo, pedido.motivo);
    }
    await fondos.actualizar(fondo.id, cambios);
    return this.lector.leer((await fondos.buscar(fondo.id))!);
  }

  private async cambiosValidos(fondo: Fondo, pedido: PeticionDeEdicion): Promise<CambiosDelFondo> {
    const { fondos, referencias } = this.dependencias;
    const cambios: CambiosDelFondo = {};
    if (pedido.nombre !== undefined) {
      cambios.nombre = exigirNombreDelFondo(pedido.nombre);
      if (await fondos.existeElNombre(cambios.nombre, fondo.id)) throw new NombreDeFondoRepetido();
    }
    if (pedido.topePorComprobante !== undefined) {
      cambios.topeCentavos = exigirTope(pedido.topePorComprobante ? aCentavos(pedido.topePorComprobante) : null);
    }
    if (pedido.localidadId !== undefined) {
      await referencias.exigirLocalidad(pedido.localidadId);
      cambios.localidadId = pedido.localidadId;
    }
    if (pedido.cuentaBancariaId !== undefined) {
      await referencias.exigirCuentaBancaria(pedido.cuentaBancariaId);
      cambios.cuentaBancariaId = pedido.cuentaBancariaId;
    }
    return cambios;
  }

  private async auditarElTope(fondo: Fondo, motivo: string | null | undefined): Promise<void> {
    await this.dependencias.auditoria.registrar({
      recurso: RECURSO_DE_FONDOS,
      registroId: fondo.id,
      accion: 'corregir',
      anterior: await this.lector.leer(fondo),
      motivo: motivo ?? null,
    });
  }
}
