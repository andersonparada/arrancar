import type { CatalogoDeMonedas, MonedasDelBanguat } from '../puertos/monedas.js';

interface Dependencias {
  catalogo: CatalogoDeMonedas;
  delBanguat: MonedasDelBanguat;
  excluidos: ReadonlySet<number>;
}

/** Una opción del selector «Moneda del Banguat» de la pantalla de Monedas. */
export interface OpcionDelBanguat {
  codigo: number;
  descripcion: string;
  disponible: boolean;
  /** Está entre los códigos que no se ofrecen (DEG, bolívares, colón salvadoreño). */
  excluida: boolean;
  /** La moneda que ya tiene ese código, si alguna: la opción se muestra deshabilitada. */
  asignadaA: string | null;
  vistaPorUltimaVez: string;
}

/** Lo que llena el selector del código del Banguat: la lista guardada y a quién pertenece cada código. */
export class ListarMonedasDelBanguat {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(): Promise<OpcionDelBanguat[]> {
    const { catalogo, delBanguat, excluidos } = this.dependencias;
    const [ofrecidas, monedas] = await Promise.all([delBanguat.listar(), catalogo.listar()]);
    const duenas = new Map(monedas.filter((m) => m.codigoBanguat !== null).map((m) => [m.codigoBanguat, m.codigo]));
    return ofrecidas.map((moneda) => ({
      ...moneda,
      excluida: excluidos.has(moneda.codigo),
      asignadaA: duenas.get(moneda.codigo) ?? null,
    }));
  }
}
