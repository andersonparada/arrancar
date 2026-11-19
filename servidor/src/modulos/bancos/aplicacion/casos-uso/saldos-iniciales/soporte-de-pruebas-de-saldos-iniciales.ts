import type { EvidenciaDto } from '../../dto/saldo-inicial.dto.js';
import type {
  ConsultasDeSaldosIniciales,
  CuentaConSuCabecera,
  PartidaDeLaBase,
  SaldoPrincipal,
} from '../../puertos/consultas-de-saldos-iniciales.js';

/** Las consultas de saldos iniciales en memoria: lo que las pruebas pongan en `cuentasDeLaEmpresa` y `partidasDeLaEmpresa`. */
export class ConsultasEnMemoria implements ConsultasDeSaldosIniciales {
  cuentasDeLaEmpresa: CuentaConSuCabecera[] = [];
  partidasDeLaEmpresa: PartidaDeLaBase[] = [];

  async cuentas() {
    return this.cuentasDeLaEmpresa;
  }
  async partidas(cuentaBancariaId?: string) {
    return this.partidasDeLaEmpresa.filter((p) => !cuentaBancariaId || p.cuentaBancariaId === cuentaBancariaId);
  }
  posfechados = { cantidad: 0, totalCentavos: 0 };

  async posfechadosSinLigar() {
    return this.posfechados;
  }
  async contarMovimientosNormalesHasta() {
    return 0;
  }
  evidencias = new Map<string, { archivoId: string; datos: EvidenciaDto }>();

  async archivoDeLaEvidencia(cuentaBancariaId: string) {
    return this.evidencias.get(cuentaBancariaId)?.archivoId ?? null;
  }
  async evidenciaDe(cuentaBancariaId: string) {
    return this.evidencias.get(cuentaBancariaId)?.datos ?? null;
  }
  async saldosPrincipales(): Promise<SaldoPrincipal[]> {
    return this.partidasDeLaEmpresa
      .filter((p) => p.parte === 'saldo_del_banco' || p.parte === 'saldo_global')
      .map((p) => ({
        cuentaBancariaId: p.cuentaBancariaId,
        parte: p.parte as SaldoPrincipal['parte'],
        fecha: p.fecha,
      }));
  }
}

export const cuenta = (id: string, cambios: Partial<CuentaConSuCabecera> = {}): CuentaConSuCabecera => ({
  cuentaBancariaId: id,
  cuentaNombre: `Cuenta ${id}`,
  bancoNombre: 'Banco',
  activa: true,
  cabeceraId: `cabecera-${id}`,
  saldoSegunLibrosAnteriores: null,
  observaciones: null,
  tieneEvidencia: false,
  tieneConciliaciones: false,
  ...cambios,
});

let secuencia = 0;
export const parte = (
  cuentaBancariaId: string,
  p: Partial<PartidaDeLaBase> & Pick<PartidaDeLaBase, 'parte' | 'monto'>,
) =>
  ({
    movimientoId: `mov-${++secuencia}`,
    cuentaBancariaId,
    tipo: 'credito',
    fecha: '2025-12-31',
    serie: null,
    numeroDeCheque: null,
    beneficiario: null,
    referencia: null,
    observaciones: null,
    conceptoId: 'concepto-saldo-inicial',
    conceptoNombre: 'Saldo inicial',
    conciliacionId: null,
    conciliadaEn: null,
    anulada: false,
    revertida: false,
    ...p,
  }) as PartidaDeLaBase;
