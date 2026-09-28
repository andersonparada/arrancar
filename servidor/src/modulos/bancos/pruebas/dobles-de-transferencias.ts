import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { CuentaBancariaDto } from '../aplicacion/dto/cuenta-bancaria.dto.js';
import type { FiltroDeTransferencias, TransferenciaDto } from '../aplicacion/dto/transferencia.dto.js';
import type { ConsultasCuentasBancarias } from '../aplicacion/puertos/consultas-cuentas-bancarias.js';
import type { ConsultasTransferencias } from '../aplicacion/puertos/consultas-transferencias.js';
import type { RepositorioTransferencias } from '../aplicacion/puertos/repositorio-transferencias.js';
import { Transferencia, type TransferenciaId } from '../dominio/transferencia.js';
import type { MovimientosEnMemoria } from './dobles-de-movimientos.js';

/** Solo los nombres de las cuentas, fijos, para que `RegistrarTransferencia` arme el beneficiario. */
export class NombresDeCuentaEnMemoria implements ConsultasCuentasBancarias {
  constructor(private readonly nombres: Map<string, string>) {}

  async listar(): Promise<CuentaBancariaDto[]> {
    return [];
  }

  async obtener(): Promise<CuentaBancariaDto> {
    throw new RecursoNoEncontrado('La cuenta bancaria');
  }

  async exigirReferencias(): Promise<void> {}

  async nombreDe(cuentaBancariaId: string): Promise<string> {
    const nombre = this.nombres.get(cuentaBancariaId);
    if (!nombre) throw new RecursoNoEncontrado('La cuenta bancaria');
    return nombre;
  }
}

const copia = (transferencia: Transferencia) => Transferencia.reconstruir(transferencia.instantanea());

interface NotasEncontradas {
  origen?: { id: string };
  destino?: { id: string };
}

const nombreDe = (nombresDeCuenta: Map<string, string>, cuentaBancariaId: string): string | null =>
  nombresDeCuenta.get(cuentaBancariaId) ?? null;

const idDeLaNota = (nota?: { id: string }): string => nota?.id ?? '';

const cumple =
  ({ cuentaBancariaId, desde, hasta }: FiltroDeTransferencias) =>
  (dto: TransferenciaDto) =>
    (!cuentaBancariaId || dto.cuentaOrigenId === cuentaBancariaId || dto.cuentaDestinoId === cuentaBancariaId) &&
    (!desde || dto.fecha >= desde) &&
    (!hasta || dto.fecha <= hasta);

/** Arma el DTO con los nombres de las cuentas y los ids de las dos notas, si ya se encontraron. */
function aDto(
  transferencia: Transferencia,
  nombresDeCuenta: Map<string, string>,
  notas: NotasEncontradas,
): TransferenciaDto {
  const { id, empresaId: _empresaId, anuladaEn, ...datos } = transferencia.instantanea();
  return {
    ...datos,
    id: id.valor,
    cuentaOrigenNombre: nombreDe(nombresDeCuenta, datos.cuentaOrigenId),
    cuentaDestinoNombre: nombreDe(nombresDeCuenta, datos.cuentaDestinoId),
    anuladaEn: anuladaEn?.toISOString() ?? null,
    movimientoOrigenId: idDeLaNota(notas.origen),
    movimientoDestinoId: idDeLaNota(notas.destino),
  };
}

/**
 * Guarda las transferencias en memoria y responde tanto de repositorio como de
 * consultas; busca sus dos notas en el doble de movimientos que recibe.
 */
export class TransferenciasEnMemoria implements RepositorioTransferencias, ConsultasTransferencias {
  private readonly registros = new Map<string, Transferencia>();

  constructor(
    private readonly movimientos: MovimientosEnMemoria,
    private readonly nombresDeCuenta = new Map<string, string>(),
  ) {}

  async buscar(id: TransferenciaId): Promise<Transferencia | null> {
    const guardada = this.registros.get(id.valor);
    return guardada ? copia(guardada) : null;
  }

  async agregar(transferencia: Transferencia): Promise<void> {
    this.registros.set(transferencia.id.valor, copia(transferencia));
  }

  async guardar(transferencia: Transferencia): Promise<void> {
    this.registros.set(transferencia.id.valor, copia(transferencia));
  }

  async obtener(transferenciaId: string): Promise<TransferenciaDto> {
    const transferencia = this.registros.get(transferenciaId);
    if (!transferencia) throw new RecursoNoEncontrado('La transferencia');
    const [origen, destino] = await this.notasDe(transferenciaId);
    return aDto(transferencia, this.nombresDeCuenta, { origen, destino });
  }

  async listar(filtro: FiltroDeTransferencias): Promise<TransferenciaDto[]> {
    const dtos = await Promise.all([...this.registros.keys()].map((id) => this.obtener(id)));
    return dtos.filter(cumple(filtro)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  private async notasDe(transferenciaId: string) {
    const esDeLaTransferencia = (m: { transferenciaId: string | null }) => m.transferenciaId === transferenciaId;
    const todas = (await this.movimientos.listar({})).filter(esDeLaTransferencia);
    return [todas.find((m) => m.tipo === 'debito'), todas.find((m) => m.tipo === 'credito')];
  }
}
