import type { ListarBitacoraReciente } from '../aplicacion/casos-uso/listar-bitacora-reciente.js';

export class BitacoraControlador {
  constructor(private readonly casosDeUso: { listarReciente: ListarBitacoraReciente }) {}

  listarReciente = () => this.casosDeUso.listarReciente.ejecutar();
}
