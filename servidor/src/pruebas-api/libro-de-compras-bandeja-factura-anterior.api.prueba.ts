/** La vista previa de la bandeja anticipa el rechazo «la factura ya es del sistema anterior» (informe QA U8l-8, punto 3). */
import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { documentoDePrueba, haceDias, nitValido, RUTA_DOCUMENTOS } from './soporte/escenario-de-documentos.js';
import { prepararBandejaGeneral, RUTA_DTE, type BandejaGeneral } from './soporte/escenario-de-bandeja.js';

const entorno = usarEntornoApi();
const NIT = nitValido('4800301');
let bandeja: BandejaGeneral;

beforeAll(async () => {
  bandeja = await prepararBandejaGeneral(entorno, {
    usuario: 'bandejafacant',
    nitDelProveedor: NIT,
  });
  const { cuenta } = bandeja.escenario;
  const inicio = await cuenta.propietario.put(`/api/empresas/${cuenta.empresaId}/carga-inicial`, {
    fechaDeInicio: haceDias(10),
  });
  expect(inicio.estado, JSON.stringify(inicio.cuerpo)).toBe(200);
  const nota = await cuenta.propietario.post(
    RUTA_DOCUMENTOS,
    documentoDePrueba(bandeja.escenario, {
      proveedorId: bandeja.proveedorId,
      nitEmisor: NIT,
      tipoDte: 'NCRE',
      serie: 'N',
      numero: 'NOTA1',
      facturaAnterior: {
        tipo: 'factura',
        serie: 'B',
        numero: 'F900',
        fechaEmision: haceDias(40),
        total: '1120.00',
        iva: '120.00',
        motivoSinCredito: null,
      },
      lineas: [{ conceptoId: bandeja.escenario.conceptoId, total: '560.00' }],
    }),
  );
  expect(nota.estado, JSON.stringify(nota.cuerpo)).toBe(201);
});

describe('vista previa de la bandeja con una factura que una nota cita como anterior', () => {
  it('el DTE con esa serie y número sale con error y el camino; otro número sale en verde', async () => {
    const citada = await bandeja.sembrar({ serie: 'B', numero: 'F900' });
    const otra = await bandeja.sembrar({ serie: 'B', numero: 'F901' });

    const respuesta = await bandeja.escenario.cuenta.propietario.post(`${RUTA_DTE}/vista-previa`, {
      ids: [citada, otra],
    });

    const porId = new Map(respuesta.cuerpo.resultados.map((r: any) => [r.id, r]));
    expect((porId.get(citada) as any).error?.codigo).toBe('factura_ya_es_del_sistema_anterior');
    expect((porId.get(otra) as any).error).toBeUndefined();
  });
});
