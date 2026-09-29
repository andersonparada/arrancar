import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { CargaInicialAbierta } from '../../../dominio/errores.js';
import type { CargaInicialDto } from '../../dto/datos-de-empresa.dto.js';
import type { DependenciasDeDatosDeEmpresa } from './dependencias.js';

interface ReaperturaDeCarga {
  empresaId: string;
  motivo: string;
}

export class ReabrirCargaInicial {
  constructor(private readonly dependencias: DependenciasDeDatosDeEmpresa) {}

  /**
   * Reabre una carga inicial cerrada. Queda en la auditoría con su motivo y cómo estaba antes.
   * @throws CargaInicialAbierta si no estaba cerrada.
   * @throws MotivoDeReaperturaInvalido si falta el motivo.
   * @throws RecursoNoEncontrado si la empresa no es de la cuenta o el operador no tiene acceso a ella.
   */
  ejecutar(operador: Operador, { empresaId, motivo }: ReaperturaDeCarga): Promise<CargaInicialDto> {
    const { ejecutorEnEmpresa, repositorioCargas, consultas, auditoria } = this.dependencias;
    return ejecutorEnEmpresa.ejecutar(operador, empresaId, async () => {
      const carga = await repositorioCargas.buscar(Identificador.desde(empresaId));
      if (!carga) throw new CargaInicialAbierta();
      const anterior = await consultas.cargaInicial(empresaId);

      const motivoLimpio = carga.reabrir(motivo);
      await repositorioCargas.guardar(carga);
      await auditoria.registrar({
        recurso: 'empresas.cargas-iniciales',
        registroId: empresaId,
        accion: 'reabrir',
        anterior,
        motivo: motivoLimpio,
      });
      return consultas.cargaInicial(empresaId);
    });
  }
}
