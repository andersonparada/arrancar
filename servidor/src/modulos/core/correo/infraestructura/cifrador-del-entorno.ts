import { configuracion } from '../../../../configuracion.js';
import { CifradorAesGcm } from './cifrador-aes-gcm.js';

/** Un solo cifrador por proceso: las llaves se leen una vez del entorno (`CLAVE_SECRETOS`, `CLAVE_SECRETOS_ANTERIOR`). */
export const cifradorDeSecretos = new CifradorAesGcm({
  actual: configuracion.CLAVE_SECRETOS,
  anterior: configuracion.CLAVE_SECRETOS_ANTERIOR,
});
