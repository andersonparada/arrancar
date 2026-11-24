import '../../core/contratos/parcelas.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { ObtenerParcelaEnFecha } from '../aplicacion/casos-uso/parcelas/obtener-parcela-en-fecha.js';
import type { ConsultasParcelas } from '../aplicacion/puertos/consultas-parcelas.js';
import type { ConsultasMediciones } from '../aplicacion/puertos/mediciones.js';

const MODULO = 'parcelas';

/** Las órdenes que Parcelas atiende para los módulos de rubro; corren dentro de la transacción de quien pregunta. */
export function atenderOrdenesDeParcelas(dependencias: {
  consultas: ConsultasParcelas;
  consultasDeMediciones: ConsultasMediciones;
}): void {
  const obtenerEnFecha = new ObtenerParcelaEnFecha(dependencias);
  mediador.atender(MODULO, 'parcelas.obtener_parcela_en_fecha', (datos) => obtenerEnFecha.ejecutar(datos));
}
