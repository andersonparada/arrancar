import type { DefinicionConfiguracion } from '../../modulos-sistema/definicion-modulo.js';
import type { DestinoConfiguracion } from '../dominio/destino.js';
import type { Alcance, VariableDto } from './dto/variable.dto.js';
import type { CatalogoDeVariables, ValoresDeInstalacion } from './puertos/catalogo-de-variables.js';
import type { RepositorioConfiguraciones, ValorGuardado } from './puertos/repositorio-configuraciones.js';
import { resolverValor, type ValoresPorNivel } from './resolucion.js';

interface Dependencias {
  repositorio: RepositorioConfiguraciones;
  catalogo: CatalogoDeVariables;
  instalacion: ValoresDeInstalacion;
}

/**
 * Valor efectivo de cada variable: el de la empresa, la cuenta o la instalación,
 * en ese orden, o el predeterminado. Es lo que usan los módulos para decidir su
 * comportamiento.
 */
export class LectorDeConfiguracion {
  constructor(private readonly dependencias: Dependencias) {}

  async obtener<Valor>(clave: string, destino: DestinoConfiguracion): Promise<Valor> {
    const definicion = this.dependencias.catalogo.definiciones().find((d) => d.clave === clave);
    if (!definicion) throw new Error(`La configuración "${clave}" no está declarada.`);
    const guardados = await this.dependencias.repositorio.listar(destino);
    return resolverValor(definicion, this.valoresPorNivel(clave, guardados)).valor as Valor;
  }

  async listar({ destino, modulosActivos }: Alcance): Promise<VariableDto[]> {
    const guardados = await this.dependencias.repositorio.listar(destino);
    return this.dependencias.catalogo
      .definiciones(modulosActivos)
      .map((definicion) => this.aVariable(definicion, this.valoresPorNivel(definicion.clave, guardados)));
  }

  /** Solo las variables públicas; viajan al navegador con la sesión. */
  async valoresPublicos(alcance: Alcance): Promise<Record<string, unknown>> {
    const publicas = new Set(
      this.dependencias.catalogo
        .definiciones(alcance.modulosActivos)
        .filter((definicion) => definicion.publica)
        .map((definicion) => definicion.clave),
    );
    const variables = await this.listar(alcance);
    return Object.fromEntries(variables.filter((v) => publicas.has(v.clave)).map((v) => [v.clave, v.efectivo]));
  }

  /** En la instalación, lo guardado desde el panel de soporte gana al archivo del servidor. */
  private valoresPorNivel(clave: string, guardados: ValorGuardado[]): ValoresPorNivel {
    const guardado = (nivel: ValorGuardado['nivel']) =>
      guardados.find((g) => g.nivel === nivel && g.clave === clave)?.valor;
    return {
      empresa: guardado('empresa'),
      cuenta: guardado('cuenta'),
      instalacion: guardado('instalacion') ?? this.dependencias.instalacion.valor(clave),
    };
  }

  private aVariable(definicion: DefinicionConfiguracion, valores: ValoresPorNivel): VariableDto {
    const { valor, origen } = resolverValor(definicion, valores);
    return {
      clave: definicion.clave,
      descripcion: definicion.descripcion,
      niveles: [...definicion.niveles],
      predeterminado: definicion.predeterminado,
      valores,
      efectivo: valor,
      origen,
    };
  }
}
