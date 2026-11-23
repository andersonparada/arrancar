import type { LlaveDeEnlace, RolDeCuenta } from '../../../../core/contratos/contabilidad.contratos.js';
import type { ConsultasConceptos } from '../../puertos/consultas-conceptos.js';
import type { ConsultasCuentasBancarias } from '../../puertos/consultas-cuentas-bancarias.js';

/**
 * Responde la pregunta `contabilidad.llaves_de_enlace` con lo que Bancos enlaza a una cuenta contable: sus cuentas
 * bancarias (rol `cuenta_bancaria`) y sus conceptos (rol `concepto_bancario`). Corre en la transacción de quien
 * pregunta, así que ve lo de la empresa activa. De los demás roles no dice nada.
 */
export class ResponderLlavesDeEnlaceDeBancos {
  constructor(
    private readonly cuentasBancarias: Pick<ConsultasCuentasBancarias, 'listar'>,
    private readonly conceptos: Pick<ConsultasConceptos, 'listar'>,
  ) {}

  async ejecutar({ rol }: { rol: RolDeCuenta }): Promise<LlaveDeEnlace[] | null> {
    if (rol === 'cuenta_bancaria') {
      const cuentas = await this.cuentasBancarias.listar();
      return cuentas.map(({ id, nombre, activo }) => ({ llave: id, nombre, activo }));
    }
    if (rol === 'concepto_bancario') {
      const conceptos = await this.conceptos.listar();
      return conceptos.map(({ id, nombre, activo }) => ({ llave: id, nombre, activo }));
    }
    return null;
  }
}
