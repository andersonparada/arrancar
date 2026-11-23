import { CodigoFueraDeLaMascara, MascaraInvalida } from './errores.js';

const FORMA_DE_LA_MASCARA = /^9+(\.9+){3,5}$/;

/**
 * La máscara de los códigos de cuenta de una empresa, por ejemplo `9.9.99.99.999`: cada grupo de nueves es un nivel y
 * su largo es el de los dígitos de ese nivel (de 4 a 6 niveles). Un código `1.1.01.01.001` es de nivel 5.
 */
export class MascaraDeCuentas {
  private constructor(
    readonly texto: string,
    private readonly anchos: readonly number[],
  ) {}

  /** @throws MascaraInvalida si no tiene de 4 a 6 niveles de nueves separados por puntos. */
  static desde(texto: string): MascaraDeCuentas {
    const limpio = texto.trim();
    if (!FORMA_DE_LA_MASCARA.test(limpio))
      throw new MascaraInvalida(
        'La máscara lleva de 4 a 6 niveles de nueves separados por puntos, como 9.9.99.99.999.',
      );
    return new MascaraDeCuentas(
      limpio,
      limpio.split('.').map((nivel) => nivel.length),
    );
  }

  get niveles(): number {
    return this.anchos.length;
  }

  /**
   * El nivel de un código que cumple la máscara (un código de nivel 3 lleva solo los tres primeros grupos).
   * @throws CodigoFueraDeLaMascara si algún grupo no es de dígitos del largo que pide su nivel.
   */
  nivelDe(codigo: string): number {
    const grupos = codigo.split('.');
    const cumple =
      grupos.length <= this.niveles &&
      grupos.every((grupo, posicion) => grupo.length === this.anchos[posicion] && /^\d+$/.test(grupo));
    if (!cumple) throw new CodigoFueraDeLaMascara(`El código ${codigo} no cumple la máscara ${this.texto}.`);
    return grupos.length;
  }

  /** El código de la cuenta superior, o `null` en el primer nivel. */
  codigoDelPadre(codigo: string): string | null {
    const grupos = codigo.split('.');
    return grupos.length === 1 ? null : grupos.slice(0, -1).join('.');
  }
}
