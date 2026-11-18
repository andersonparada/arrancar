import type { Operador } from '../../compartido/aplicacion/operador.js';
import type {
  AvisosEntreModulos,
  NombreDeAviso,
  NombreDeOrden,
  NombreDePregunta,
  OrdenesEntreModulos,
  PreguntasEntreModulos,
} from '../../contratos/mediador.contratos.js';
import { ManejadorDuplicadoParaLaPregunta, ManejadorDuplicadoParaLaOrden, ModuloNoDisponible } from './errores.js';
import type { ModulosActivosDeLaCuenta } from './puertos/modulos-activos-de-la-cuenta.js';

type ManejadorDeOrden<Nombre extends NombreDeOrden> = (
  datos: OrdenesEntreModulos[Nombre]['datos'],
  operador: Operador,
) => Promise<OrdenesEntreModulos[Nombre]['respuesta']>;

type ManejadorDeAviso<Nombre extends NombreDeAviso> = (
  datos: AvisosEntreModulos[Nombre],
  operador: Operador,
) => Promise<void>;

type ManejadorDePregunta<Nombre extends NombreDePregunta> = (
  datos: PreguntasEntreModulos[Nombre]['datos'],
  operador: Operador,
) => Promise<PreguntasEntreModulos[Nombre]['respuesta']>;

/** Respuesta no nula a una pregunta, con el módulo que la dio. */
export interface RespuestaDeModulo<Respuesta> {
  modulo: string;
  respuesta: Respuesta;
}

interface PreguntaRegistrada {
  modulo: string;
  manejador: ManejadorDePregunta<never>;
}

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
 * - **Pregunta a todos**: la responden cero o varios módulos activos, en el orden de registro; las respuestas `null`
 *   se omiten y, si uno lanza, el error se propaga (nunca se decide con una respuesta incompleta).
 *
 * No hay ninguna ruta HTTP para ninguno de los dos: el permiso lo exige la ruta
 * del módulo que origina, y el mediador no revisa permisos del módulo que atiende
 * (decisión acordada, ver `docs/ARQUITECTURA.md`).
 */
export class Mediador {
  private readonly ordenes = new Map<NombreDeOrden, OrdenRegistrada>();
  private readonly avisos = new Map<NombreDeAviso, AvisoRegistrado[]>();
  private readonly preguntas = new Map<NombreDePregunta, PreguntaRegistrada[]>();

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

  /** Registra que un módulo responde una pregunta. Responder dos veces la misma pregunta desde un módulo es un error. */
  responder<Nombre extends NombreDePregunta>(
    modulo: string,
    pregunta: Nombre,
    manejador: ManejadorDePregunta<Nombre>,
  ): void {
    const respondedores = this.preguntas.get(pregunta) ?? [];
    if (respondedores.some((registrado) => registrado.modulo === modulo)) {
      throw new ManejadorDuplicadoParaLaPregunta(pregunta, modulo);
    }
    respondedores.push({ modulo, manejador: manejador as unknown as ManejadorDePregunta<never> });
    this.preguntas.set(pregunta, respondedores);
  }

  /**
   * Quita todo lo que un módulo registró (las órdenes que atiende, los avisos que escucha y las preguntas que responde). Es para las pruebas, que
   * lo cambian por un doble; en producción nadie lo llama.
   */
  retirarManejadoresDe(modulo: string): void {
    for (const [orden, registrada] of this.ordenes) if (registrada.modulo === modulo) this.ordenes.delete(orden);
    this.retirarPreguntasDe(modulo);
    for (const [aviso, escuchas] of this.avisos) {
      this.avisos.set(
        aviso,
        escuchas.filter((escucha) => escucha.modulo !== modulo),
      );
    }
  }

  /** Quita las preguntas que un módulo responde. */
  private retirarPreguntasDe(modulo: string): void {
    for (const [pregunta, respondedores] of this.preguntas) {
      this.preguntas.set(
        pregunta,
        respondedores.filter((registrado) => registrado.modulo !== modulo),
      );
    }
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

  /** Pregunta a todos los módulos activos que responden; devuelve solo las respuestas no nulas, en orden de registro. */
  async preguntarATodos<Nombre extends NombreDePregunta>(
    operador: Operador,
    pregunta: Nombre,
    datos: PreguntasEntreModulos[Nombre]['datos'],
  ): Promise<RespuestaDeModulo<NonNullable<PreguntasEntreModulos[Nombre]['respuesta']>>[]> {
    const juntadas: RespuestaDeModulo<NonNullable<PreguntasEntreModulos[Nombre]['respuesta']>>[] = [];
    for (const registrado of this.preguntas.get(pregunta) ?? []) {
      if (!(await this.moduloActivo(operador, registrado.modulo))) continue;
      const respuesta = await (registrado.manejador as unknown as ManejadorDePregunta<Nombre>)(datos, operador);
      if (respuesta !== null && respuesta !== undefined) juntadas.push({ modulo: registrado.modulo, respuesta });
    }
    return juntadas;
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
