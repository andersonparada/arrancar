import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { SinBalanceDeApertura } from '../../errores-de-cierre.js';
import type { CargaInicialDto } from '../../dto/datos-de-empresa.dto.js';
import { RECURSO_DE_BALANCES_DE_APERTURA, type DependenciasDelBalanceDeApertura } from './dependencias.js';

/** Quita el balance de apertura con la carga abierta: borra el archivo y deja rastro con cómo era. */
export class QuitarBalanceDeApertura {
  constructor(private readonly dependencias: DependenciasDelBalanceDeApertura) {}

  /**
   * @throws SinBalanceDeApertura si no hay balance (404).
   * @throws BalanceDeAperturaFijo si la carga está cerrada: hay que reabrirla primero.
   */
  ejecutar(operador: Operador, empresaId: string): Promise<CargaInicialDto> {
    const { ejecutorEnEmpresa, repositorioCargas, consultas, documentos, auditoria } = this.dependencias;
    return ejecutorEnEmpresa.ejecutar(operador, empresaId, async () => {
      const carga = await repositorioCargas.buscar(Identificador.desde(empresaId));
      if (!carga?.tieneBalanceDeApertura) throw new SinBalanceDeApertura();
      const antes = await consultas.cargaInicial(empresaId);
      const archivoId = carga.quitarBalanceDeApertura();
      await repositorioCargas.guardar(carga);
      if (archivoId) await documentos.eliminar(archivoId, RECURSO_DE_BALANCES_DE_APERTURA);
      await auditoria.registrar({
        recurso: 'empresas.cargas-iniciales',
        registroId: empresaId,
        accion: 'quitar',
        anterior: { balanceDeApertura: antes.balanceDeApertura },
      });
      return consultas.cargaInicial(empresaId);
    });
  }
}
