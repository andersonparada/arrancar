import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { TIPOS_DE_LOCALIDAD_INICIALES } from '../../../dominio/tipos-de-localidad-iniciales.js';
import { TipoDeLocalidad } from '../../../dominio/tipo-de-localidad.js';
import type { RepositorioTiposDeLocalidad } from '../../puertos/repositorio-tipos-de-localidad.js';

/**
 * Da a la empresa del operador su lista sugerida de tipos de localidad. Solo actúa si no tiene ninguno (empresa
 * nueva, o creada por la alta de cuenta); una vez sembrada, la empresa manda y nada se vuelve a agregar.
 *
 * Corre dentro de la unidad de trabajo de quien la llama, con la empresa a sembrar como empresa activa.
 */
export class SembrarTiposDeLocalidad {
  constructor(private readonly repositorio: RepositorioTiposDeLocalidad) {}

  async ejecutar(operador: Operador): Promise<void> {
    if (await this.repositorio.hayAlguno()) return;
    const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
    const tipos = TIPOS_DE_LOCALIDAD_INICIALES.map((nombre) =>
      TipoDeLocalidad.crear(empresaId, { nombre, activo: true }),
    );
    await this.repositorio.sembrar(tipos);
  }
}
