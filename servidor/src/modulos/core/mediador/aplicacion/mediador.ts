import type { Operador } from '../../compartido/aplicacion/operador.js';
import type {
  AvisosEntreModulos,
  NombreDeAviso,
  NombreDeOrden,
  OrdenesEntreModulos,
} from '../../contratos/mediador.contratos.js';
import { ManejadorDuplicadoParaLaOrden, ModuloNoDisponible } from './errores.js';
import type { ModulosActivosDeLaCuenta } from './puertos/modulos-activos-de-la-cuenta.js';

type ManejadorDeOrden<Nombre extends NombreDeOrden> = (
  datos: OrdenesEntreModulos[Nombre]['datos'],
  operador: Operador,
) => Promise<OrdenesEntreModulos[Nombre]['respuesta']>;

type ManejadorDeAviso<Nombre extends NombreDeAviso> = (
  datos: AvisosEntreModulos[Nombre],
  operador: Operador,
) => Promise<void>;

interface OrdenRegistrada {
  modulo: string;
  manejador: ManejadorDeOrden<never>;
}

interface AvisoRegistrado {
  modulo: string;
  manejador: ManejadorDeAviso<never>;
}

interface Dependencias {
  modulosActivos: ModulosActivosDeLaCuenta;
}

/**
 * Mediator (refactoring.guru) entre módulos: comunicación **síncrona**, dentro de
 * la misma transacción del caso de uso que envía, sin que un módulo importe a otro.
 *
 * - **Orden**: la atiende exactamente un módulo y devuelve una respuesta; si el
 *   manejador lanza, el error se propaga y la transacción se deshace entera.
 * - **Aviso**: lo atienden cero o varios módulos, en orden; si uno rechaza (lanza),
 *   se deshace toda la operación del que avisó.
 *
 * No hay ninguna ruta HTTP para ninguno de los dos: el permiso lo exige la ruta
 * del módulo que origina, y el mediador no revisa permisos del módulo que atiende
 * (decisión acordada, ver `docs/ARQUITECTURA.md`).
 */
export class Mediador {
  private readonly ordenes = new Map<NombreDeOrden, OrdenRegistrada>();
  private readonly avisos = new Map<NombreDeAviso, AvisoRegistrado[]>();

  constructor(private readonly dependencias: Dependencias) {}

  /** Registra quién atiende una orden. Dos manejadores para la misma orden es un error de programación. */
  atender<Nombre extends NombreDeOrden>(modulo: string, orden: Nombre, manejador: ManejadorDeOrden<Nombre>): void {
    if (this.ordenes.has(orden)) throw new ManejadorDuplicadoParaLaOrden(orden);
    this.ordenes.set(orden, { modulo, manejador: manejador as unknown as ManejadorDeOrden<never> });
  }

  /** Registra un módulo que escucha un aviso; se llama en el orden en que se registró. */
  escuchar<Nombre extends NombreDeAviso>(modulo: string, aviso: Nombre, manejador: ManejadorDeAviso<Nombre>): void {
    const escuchas = this.avisos.get(aviso) ?? [];
    escuchas.push({ modulo, manejador: manejador as unknown as ManejadorDeAviso<never> });
    this.avisos.set(aviso, escuchas);
  }

  /** @throws ModuloNoDisponible si nadie la atiende o el módulo no está activo en la cuenta del operador. */
  async enviar<Nombre extends NombreDeOrden>(
    operador: Operador,
    orden: Nombre,
    datos: OrdenesEntreModulos[Nombre]['datos'],
  ): Promise<OrdenesEntreModulos[Nombre]['respuesta']> {
    const registrada = this.ordenes.get(orden);
    if (!registrada) throw new ModuloNoDisponible(`No hay ningún módulo que atienda "${orden}".`);
    await this.exigirModuloActivo(operador, registrada.modulo);
    return (registrada.manejador as unknown as ManejadorDeOrden<Nombre>)(datos, operador);
  }

  /** Los manejadores de módulos inactivos no se llaman; los demás, en orden. */
  async avisar<Nombre extends NombreDeAviso>(
    operador: Operador,
    aviso: Nombre,
    datos: AvisosEntreModulos[Nombre],
  ): Promise<void> {
    for (const escucha of this.avisos.get(aviso) ?? []) {
      if (!(await this.moduloActivo(operador, escucha.modulo))) continue;
      await (escucha.manejador as unknown as ManejadorDeAviso<Nombre>)(datos, operador);
    }
  }

  private async exigirModuloActivo(operador: Operador, modulo: string): Promise<void> {
    if (!(await this.moduloActivo(operador, modulo))) {
      throw new ModuloNoDisponible(`El módulo "${modulo}" no está activo en esta cuenta.`);
    }
  }

  private async moduloActivo(operador: Operador, modulo: string): Promise<boolean> {
    return (await this.dependencias.modulosActivos.activosPara(operador.cuentaId)).has(modulo);
  }
}
