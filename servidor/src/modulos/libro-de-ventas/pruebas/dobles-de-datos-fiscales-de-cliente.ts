import type { RepositorioDeDatosFiscalesDeCliente } from '../aplicacion/puertos/repositorio-de-datos-fiscales-de-cliente.js';
import type { DatosFiscalesDeCliente } from '../dominio/datos-fiscales-de-cliente.js';

/** Los datos fiscales de los clientes en memoria; `existentes` son los clientes de la cuenta. */
export class DatosFiscalesDeClienteEnMemoria implements RepositorioDeDatosFiscalesDeCliente {
  readonly filas = new Map<string, DatosFiscalesDeCliente>();

  constructor(private readonly existentes: readonly string[] = []) {}

  async buscar(clienteId: string): Promise<DatosFiscalesDeCliente | null> {
    return this.filas.get(clienteId) ?? null;
  }

  async guardar(clienteId: string, datos: DatosFiscalesDeCliente): Promise<void> {
    this.filas.set(clienteId, datos);
  }

  async existe(clienteId: string): Promise<boolean> {
    return this.existentes.includes(clienteId);
  }
}
