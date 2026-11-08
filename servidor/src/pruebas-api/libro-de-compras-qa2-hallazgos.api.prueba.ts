import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { nitValido } from './soporte/escenario-de-documentos.js';
import { prepararBandejaGeneral, RUTA_DTE, type BandejaGeneral } from './soporte/escenario-de-bandeja.js';
import { mesDe } from './soporte/escenario-de-periodos.js';

/**
 * Hallazgos del QA en el navegador con el archivo real de la SAT (informe-qa-2026-11-01-b).
 */
const entorno = usarEntornoApi();
let bandeja: BandejaGeneral;

beforeAll(async () => {
  bandeja = await prepararBandejaGeneral(entorno, { usuario: 'bandejaqados', nitDelProveedor: nitValido('4800201') });
});

describe('hallazgos del QA con el archivo real de la SAT', () => {
  it('la vista previa de un DTE anulado en la SAT dice que no se registra, igual que confirmar', async () => {
    const id = await bandeja.sembrar({ estadoSat: 'anulado', anuladoEnLaSatEl: mesDe(0) });

    const respuesta = await bandeja.escenario.cuenta.propietario.post(`${RUTA_DTE}/vista-previa`, { ids: [id] });

    const resultado = respuesta.cuerpo.resultados[0];
    expect(resultado.error?.codigo).toBe('dte_anulado_en_la_sat');
  });
});
