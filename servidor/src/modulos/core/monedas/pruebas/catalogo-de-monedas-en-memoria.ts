import type { CambiosDeMoneda } from '../dominio/moneda.js';
import type {
  CatalogoDeMonedas,
  MonedaDelBanguatGuardada,
  MonedaDto,
  MonedasDelBanguat,
} from '../aplicacion/puertos/monedas.js';

const moneda = (codigo: string, nombre: string, extra: Partial<MonedaDto> = {}): MonedaDto => ({
  codigo,
  nombre,
  simbolo: codigo,
  decimales: 2,
  activa: false,
  codigoBanguat: null,
  letrasSingular: null,
  letrasPlural: null,
  descripcionBanguat: null,
  tieneSerieDelBanguat: false,
  ...extra,
});

/** Un catálogo como el sembrado: GTQ y USD activos (el dólar con el código 2), EUR, GBP y JPY inactivos. */
export class CatalogoDeMonedasEnMemoria implements CatalogoDeMonedas {
  readonly monedas: MonedaDto[] = [
    moneda('GTQ', 'Quetzal', { activa: true, letrasSingular: 'QUETZAL', letrasPlural: 'QUETZALES' }),
    moneda('USD', 'Dólar', { activa: true, codigoBanguat: 2, descripcionBanguat: 'Dólares de EE.UU.' }),
    moneda('EUR', 'Euro'),
    moneda('GBP', 'Libra esterlina'),
    moneda('JPY', 'Yen', { decimales: 0 }),
  ];
  /** El código con que se cargó la serie del Banguat de cada moneda. */
  readonly series = new Map<string, number>();

  async listar(): Promise<MonedaDto[]> {
    return this.monedas.map((m) => ({ ...m }));
  }

  async buscar(codigo: string): Promise<MonedaDto | null> {
    const encontrada = this.monedas.find((m) => m.codigo === codigo);
    return encontrada ? { ...encontrada } : null;
  }

  async actualizar(codigo: string, cambios: CambiosDeMoneda): Promise<void> {
    const encontrada = this.monedas.find((m) => m.codigo === codigo)!;
    for (const [campo, valor] of Object.entries(cambios))
      if (valor !== undefined) Object.assign(encontrada, { [campo]: valor });
  }

  async duenaDelCodigo(codigoBanguat: number): Promise<string | null> {
    return this.monedas.find((m) => m.codigoBanguat === codigoBanguat)?.codigo ?? null;
  }

  async codigoDeLaSerie(codigo: string): Promise<number | null> {
    return this.series.get(codigo) ?? null;
  }
}

/** La lista del Banguat de la prueba: dólar, euro y libra disponibles, y un código que dejó de venir. */
export class MonedasDelBanguatEnMemoria implements MonedasDelBanguat {
  readonly ofrecidas: MonedaDelBanguatGuardada[] = [
    { codigo: 2, descripcion: 'Dólares de EE.UU.', disponible: true, vistaPorUltimaVez: '2026-11-18T06:00:00.000Z' },
    { codigo: 28, descripcion: 'Euro', disponible: true, vistaPorUltimaVez: '2026-11-18T06:00:00.000Z' },
    { codigo: 29, descripcion: 'Libra', disponible: true, vistaPorUltimaVez: '2026-11-18T06:00:00.000Z' },
    { codigo: 99, descripcion: 'Retirada', disponible: false, vistaPorUltimaVez: '2026-01-01T06:00:00.000Z' },
  ];

  async listar(): Promise<MonedaDelBanguatGuardada[]> {
    return this.ofrecidas;
  }

  async buscar(codigo: number): Promise<MonedaDelBanguatGuardada | null> {
    return this.ofrecidas.find((o) => o.codigo === codigo) ?? null;
  }
}
