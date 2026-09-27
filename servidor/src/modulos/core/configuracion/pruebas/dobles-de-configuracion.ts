import type { DefinicionConfiguracion, NivelConfiguracion } from '../../modulos-sistema/definicion-modulo.js';
import type { CatalogoDeVariables, ValoresDeInstalacion } from '../aplicacion/puertos/catalogo-de-variables.js';
import type {
  RepositorioConfiguraciones,
  ValorAGuardar,
  ValorGuardado,
} from '../aplicacion/puertos/repositorio-configuraciones.js';
import type { DestinoConfiguracion } from '../dominio/destino.js';

/** Las variables de cada módulo, como si fueran las que declaran los módulos instalados. */
export class CatalogoFijo implements CatalogoDeVariables {
  constructor(private readonly porModulo: Record<string, DefinicionConfiguracion[]>) {}

  definiciones(modulosActivos?: ReadonlySet<string>): DefinicionConfiguracion[] {
    return Object.entries(this.porModulo)
      .filter(([modulo]) => !modulosActivos || modulosActivos.has(modulo))
      .flatMap(([, definiciones]) => definiciones);
  }
}

export class InstalacionFija implements ValoresDeInstalacion {
  constructor(private readonly valores: Record<string, unknown> = {}) {}

  valor(clave: string): unknown {
    return this.valores[clave];
  }
}

function perteneceAlDestino(guardado: ValorAGuardar, destino: DestinoConfiguracion): boolean {
  if (guardado.nivel === 'instalacion') return true;
  if (guardado.nivel === 'cuenta') return guardado.destino.cuentaId === destino.cuentaId;
  return guardado.destino.empresaId === destino.empresaId;
}

export class RepositorioConfiguracionesEnMemoria implements RepositorioConfiguraciones {
  guardados: ValorAGuardar[] = [];

  async listar(destino: DestinoConfiguracion): Promise<ValorGuardado[]> {
    return this.guardados.filter((guardado) => perteneceAlDestino(guardado, destino));
  }

  async guardar(valor: ValorAGuardar): Promise<void> {
    await this.eliminar(valor.nivel, valor.destino, valor.clave);
    this.guardados.push(valor);
  }

  async eliminar(nivel: NivelConfiguracion, destino: DestinoConfiguracion, clave: string): Promise<void> {
    this.guardados = this.guardados.filter(
      (g) => !(g.nivel === nivel && g.clave === clave && perteneceAlDestino(g, destino)),
    );
  }
}
