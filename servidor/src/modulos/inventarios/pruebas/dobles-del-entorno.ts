import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type {
  CargaInicial,
  LectorDeTransito,
  LectorDelMetodoInicial,
  MesesCerrados,
} from '../aplicacion/puertos/entorno-del-kardex.js';
import type { MetodoDeCosteo } from '../dominio/costeo/tipos.js';

/** La carga inicial de una empresa: con o sin fecha de inicio. */
export class CargaInicialFija implements CargaInicial {
  constructor(public fechaDeInicio: string | null = null) {}

  async obtener(_operador: Operador) {
    return { fechaDeInicio: this.fechaDeInicio, cerrada: false };
  }
}

export class MesesCerradosFijos implements MesesCerrados {
  constructor(public cerrados: string[] = []) {}

  async estaCerrado(periodo: string): Promise<boolean> {
    return this.cerrados.includes(periodo);
  }
}

export class MetodoInicialFijo implements LectorDelMetodoInicial {
  constructor(public metodo: MetodoDeCosteo = 'promedio_ponderado') {}

  async paraEmpresa(): Promise<MetodoDeCosteo> {
    return this.metodo;
  }
}

export class TransitoFijo implements LectorDeTransito {
  constructor(public activo = false) {}

  async conTransito(): Promise<boolean> {
    return this.activo;
  }
}
