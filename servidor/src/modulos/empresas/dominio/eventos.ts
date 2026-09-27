import { EventoDominio } from '../../core/compartido/dominio/evento-dominio.js';
import type { CuentaId } from '../../core/compartido/dominio/identificador.js';
import type { EmpresaId } from './empresa.js';

/** Hay un rancho o parcela nuevo en la cuenta; otros módulos pueden prepararle sus datos iniciales. */
export class EmpresaRegistrada extends EventoDominio<{ empresaId: string; cuentaId: string }> {
  readonly nombre = 'empresas.registrada';

  constructor(empresaId: EmpresaId, cuentaId: CuentaId) {
    super({ empresaId: empresaId.valor, cuentaId: cuentaId.valor });
  }
}
