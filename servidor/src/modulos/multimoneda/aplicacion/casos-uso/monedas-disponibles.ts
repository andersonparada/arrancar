import type { MonedaDisponible } from '../../../core/contratos/multimoneda.contratos.js';
import type { CatalogoDeMonedasDelNucleo } from '../puertos/catalogo-de-monedas.js';

const MONEDA_BASE = 'GTQ';

interface Dependencias {
  catalogo: CatalogoDeMonedasDelNucleo;
}

/**
 * Atiende la orden `multimoneda.monedas_disponibles`: las monedas activas del catálogo distintas del quetzal. En la
 * versión 1 no hay lista por empresa: lo que activa soporte lo ve toda empresa con el módulo.
 */
export class MonedasDisponibles {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(): Promise<{ monedas: MonedaDisponible[] }> {
    const monedas = await this.dependencias.catalogo.listar();
    return {
      monedas: monedas
        .filter((moneda) => moneda.activa && moneda.codigo !== MONEDA_BASE)
        .map(({ codigo, nombre, simbolo, decimales }) => ({ codigo, nombre, simbolo, decimales })),
    };
  }
}
