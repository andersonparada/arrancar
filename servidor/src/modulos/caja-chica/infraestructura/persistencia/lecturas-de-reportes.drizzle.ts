import type {
  ArqueoDeReporte,
  ComprobanteDeReporte,
  EstadoDeFondoAlCorte,
  FiltroAlCorte,
  FiltroDeArqueosDelPeriodo,
  FiltroDeFondosAlCorte,
  FiltroDePeriodo,
  LecturasDeReportesDeCajaChica,
  ReposicionDeReporte,
} from '../../aplicacion/puertos/puertos-de-reportes.js';
import { arqueosDelPeriodoDe } from './reportes-de-arqueos.lectura.js';
import { pendientesAlCorteDe, sinDocumentoFiscalDe } from './reportes-de-comprobantes.lectura.js';
import { fondosAlCorteDe } from './reportes-de-fondos-al-corte.lectura.js';
import { reposicionesDelPeriodoDe } from './reportes-de-reposiciones.lectura.js';

/** Las lecturas de los reportes de Caja chica: seguridad por empresa y por el alcance de cada fondo (RLS). */
export class LecturasDeReportesDeCajaChicaDrizzle implements LecturasDeReportesDeCajaChica {
  pendientesAlCorte(filtro: FiltroAlCorte): Promise<ComprobanteDeReporte[]> {
    return pendientesAlCorteDe(filtro);
  }

  reposicionesDelPeriodo(filtro: FiltroDePeriodo): Promise<ReposicionDeReporte[]> {
    return reposicionesDelPeriodoDe(filtro);
  }

  sinDocumentoFiscal(filtro: FiltroDePeriodo): Promise<ComprobanteDeReporte[]> {
    return sinDocumentoFiscalDe(filtro);
  }

  fondosAlCorte(filtro: FiltroDeFondosAlCorte): Promise<EstadoDeFondoAlCorte[]> {
    return fondosAlCorteDe(filtro);
  }

  arqueosDelPeriodo(filtro: FiltroDeArqueosDelPeriodo): Promise<ArqueoDeReporte[]> {
    return arqueosDelPeriodoDe(filtro);
  }
}
