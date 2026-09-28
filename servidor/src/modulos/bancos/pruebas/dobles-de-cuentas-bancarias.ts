import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { CuentaBancariaDto } from '../aplicacion/dto/cuenta-bancaria.dto.js';
import type { ConsultasCuentasBancarias } from '../aplicacion/puertos/consultas-cuentas-bancarias.js';
import type { RepositorioCuentasBancarias } from '../aplicacion/puertos/repositorio-cuentas-bancarias.js';
import type { CuentaBancaria, CuentaBancariaId } from '../dominio/cuenta-bancaria.js';

function aDto(cuentaBancaria: CuentaBancaria): CuentaBancariaDto {
  const { id, empresaId, ...datos } = cuentaBancaria.instantanea();
  return { ...datos, id: id.valor, bancoNombre: null, saldo: '0.00' };
}

/** Guarda las cuentas bancarias en memoria y responde tanto de repositorio como de consultas. */
export class CuentasBancariasEnMemoria implements RepositorioCuentasBancarias, ConsultasCuentasBancarias {
  private readonly registros = new Map<string, CuentaBancaria>();

  async buscar(id: CuentaBancariaId): Promise<CuentaBancaria | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(cuentaBancaria: CuentaBancaria): Promise<void> {
    this.registros.set(cuentaBancaria.id.valor, cuentaBancaria);
  }

  async guardar(cuentaBancaria: CuentaBancaria): Promise<void> {
    this.registros.set(cuentaBancaria.id.valor, cuentaBancaria);
  }

  async listar(): Promise<CuentaBancariaDto[]> {
    const porNombre = (a: CuentaBancariaDto, b: CuentaBancariaDto) => String(a.nombre).localeCompare(String(b.nombre));
    return [...this.registros.values()].map(aDto).sort(porNombre);
  }

  async obtener(cuentaBancariaId: string): Promise<CuentaBancariaDto> {
    const cuentaBancaria = this.registros.get(cuentaBancariaId);
    if (!cuentaBancaria) throw new RecursoNoEncontrado('La cuenta bancaria');
    return aDto(cuentaBancaria);
  }

  /** En memoria, todo lo elegido existe. */
  exigirReferencias(): Promise<void> {
    return Promise.resolve();
  }
}
