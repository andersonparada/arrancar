/**
 * CC-R4 con un vale provisional liquidado después del corte: el efectivo sale una sola vez, como vale abierto, y los
 * comprobantes de esa liquidación (con fecha de la factura, anterior a la liquidación) no se vuelven a restar como pendientes.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { EscenarioDeComprobantes } from './soporte/caja-chica-comprobantes.js';
import { AyudasDeVales } from './soporte/caja-chica-vales-provisionales.js';
import { verReporte } from './soporte/caja-chica-reportes.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { haceDias } from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();

let e: EscenarioDeComprobantes;
let v: AyudasDeVales;

beforeAll(async () => {
  e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicareportesvale');
  v = new AyudasDeVales(e);
});

describe('CC-R4: vale liquidado después del corte', () => {
  it('cuenta el efectivo del vale una sola vez', async () => {
    const fondo = await v.fondoDe('Caja del corte con vale');
    const vale = await v.entregarBien(fondo.id);
    const { documentoId } = await e.registrarEnElLibro({ total: '300.00' });
    const documento = await e.enLaBandeja(documentoId);
    const liquidado = await v.liquidar(vale.id, {
      documentos: [{ comprobanteId: documento.id }],
      valesDeGasto: [v.gasto()],
    });
    expect(liquidado.estado, JSON.stringify(liquidado.cuerpo)).toBe(200);
    await comoPropietario('update caja_chica.fondos set fecha_de_apertura = $2 where id = $1', [fondo.id, haceDias(7)]);
    await comoPropietario('update caja_chica.cambios_de_monto set fecha = $2 where fondo_id = $1', [
      fondo.id,
      haceDias(7),
    ]);
    await comoPropietario('update caja_chica.vales_provisionales set fecha = $2 where id = $1', [vale.id, haceDias(6)]);
    await comoPropietario('update caja_chica.comprobantes set fecha = $2 where vale_provisional_id = $1', [
      vale.id,
      haceDias(5),
    ]);

    const alCorte = await verReporte(e.propietario(), `estado-de-fondos?corte=${haceDias(4)}&fondoId=${fondo.id}`);
    const hoy = await verReporte(e.propietario(), `estado-de-fondos?fondoId=${fondo.id}`);

    expect(alCorte.fondos[0]).toMatchObject({
      valesAbiertos: '500.00',
      pendienteDeReponer: '0.00',
      efectivoEsperado: '2500.00',
    });
    expect(hoy.fondos[0]).toMatchObject({ valesAbiertos: '0.00', pendienteDeReponer: '350.00' });
  });
});
