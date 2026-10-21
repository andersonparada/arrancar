import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { SaldoDelProveedorDto } from '../../dto/documento-por-pagar.dto.js';
import type { ConsultasDeSaldos } from '../../puertos/puertos-de-consultas.js';
import type { DependenciasDeConsultas } from './dependencias-de-consultas.js';

type Dependencias = Omit<DependenciasDeConsultas, 'consultas'> & { saldos: ConsultasDeSaldos };

/**
 * Lo que la empresa activa le debe a un proveedor. Los saldos deudores (el saldo libre de las notas de crédito, que el
 * proveedor le debe a la empresa porque la retención ya se practicó) se muestran aparte y no se restan de la deuda: se
 * compensan en una factura futura o con un reintegro del proveedor (U13).
 */
export class ObtenerSaldoDelProveedor {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si el proveedor no existe en la cuenta. */
  ejecutar(operador: Operador, proveedorId: string): Promise<SaldoDelProveedorDto> {
    const { unidadDeTrabajo, saldos, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const totales = await saldos.totalesDelProveedor(proveedorId, await reloj.hoy(operador));
      if (!totales) throw new RecursoNoEncontrado('El proveedor');
      const notas = await saldos.notasConSaldoLibre(proveedorId);
      const aFavor = notas.reduce((suma, { saldoLibreCentavos }) => suma + saldoLibreCentavos, 0);
      return {
        proveedorId,
        proveedorNombre: totales.proveedorNombre,
        porPagar: deCentavos(totales.porPagarCentavos),
        vencido: deCentavos(totales.vencidoCentavos),
        cargosConSaldo: totales.cargosConSaldo,
        saldosDeudores: deCentavos(aFavor),
        notasConSaldoLibre: notas.map(({ saldoLibreCentavos, ...nota }) => ({
          ...nota,
          saldoLibre: deCentavos(saldoLibreCentavos),
        })),
      };
    });
  }
}
