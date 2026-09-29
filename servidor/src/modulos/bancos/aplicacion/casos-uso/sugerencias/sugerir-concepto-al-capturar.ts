import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { aCentavos } from '../../../dominio/centavos.js';
import { direccionDe } from '../../../dominio/sugerencias/tipos.js';
import type { SolicitudDeSugerencia, SugerenciaDeConcepto } from '../../dto/sugerencia.dto.js';
import type { ConsultasDeSugerencias } from '../../puertos/consultas-de-sugerencias.js';
import type { MotorDeSugerencias } from '../../sugerencias/motor-de-sugerencias.js';

/** Sin monto (o en cero) el monto no distingue a ningún ejemplo. */
const centavosOSinMonto = (monto: string | null | undefined): number | null => {
  const centavos = monto ? aCentavos(monto) : 0;
  return centavos > 0 ? centavos : null;
};

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultasDeSugerencias: ConsultasDeSugerencias;
  motor: MotorDeSugerencias;
  reloj: Reloj;
}

/**
 * Sugiere el concepto de una nota o un cheque que se está capturando (P7, §5.3), con el mismo cálculo de la bandeja.
 * Solo lee: no guarda nada ni deja rastro. Sin monto o sin fecha, no se distingue por ellos (fecha: hoy).
 */
export class SugerirConceptoAlCapturar {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador, solicitud: SolicitudDeSugerencia): Promise<SugerenciaDeConcepto> {
    const { unidadDeTrabajo, consultasDeSugerencias, motor, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const beneficiario = await consultasDeSugerencias.nombreParaComparar(solicitud.beneficiario ?? null);
      const texto = [solicitud.referencia, solicitud.observaciones].filter(Boolean).join(' ') || null;
      const pendiente = {
        id: null,
        fecha: solicitud.fecha ?? (await reloj.hoy(operador)),
        montoEnCentavos: centavosOSinMonto(solicitud.monto),
        direccion: direccionDe(solicitud.tipo),
        cuentaBancariaId: solicitud.cuentaBancariaId,
        beneficiarioParaComparar: beneficiario,
        textoParaComparar: await consultasDeSugerencias.nombreParaComparar(texto),
      };
      const [votacion] = await motor.sugerir(operador, [{ pendiente, tipo: solicitud.tipo }]);
      return votacion!;
    });
  }
}
