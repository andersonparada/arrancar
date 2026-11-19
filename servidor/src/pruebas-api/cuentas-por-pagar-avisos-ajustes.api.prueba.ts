/** La pantalla «Avisos de pago»: los usuarios de la empresa cambian sus ajustes sin abrir `configuracion.gestionar`. */

import { beforeAll, describe, expect, it } from 'vitest';
import { AvisosDePrueba } from './soporte/cuentas-por-pagar-avisos.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const entorno = usarEntornoApi();
const RUTA = '/api/cuentas-por-pagar/avisos-de-pago/ajustes';
let a: AvisosDePrueba;

const ajustes = {
  envio: 'automatico',
  asunto: 'Pago {numero} de {empresa}',
  mensaje: 'Le pagamos {monto}. {adjunto}Gracias.',
  adjuntarComprobante: false,
  copiaALaEmpresa: false,
};

beforeAll(async () => {
  a = await AvisosDePrueba.preparar(entorno, 'cxpavisosajustes');
});

describe('ajustes de los avisos de pago', () => {
  it('quien tiene el permiso los ve y los guarda para su empresa', async () => {
    const antes = await a.e.propietario().get(RUTA);
    expect(antes.estado).toBe(200);
    expect(antes.cuerpo.envio).toBe('manual');
    expect(antes.cuerpo.marcadoresDelMensaje).toContain('adjunto');

    const guardado = await a.e.propietario().put(RUTA, ajustes);
    expect(guardado.estado).toBe(200);

    expect((await a.e.propietario().get(RUTA)).cuerpo).toMatchObject(ajustes);
  });

  it('un valor que no cumple el esquema de la variable se rechaza y no cambia nada', async () => {
    const marcador = await a.e.propietario().put(RUTA, { ...ajustes, asunto: 'Pago {inventado}' });
    const envio = await a.e.propietario().put(RUTA, { ...ajustes, envio: 'siempre' });

    expect(marcador.estado).toBe(400);
    expect(envio.estado).toBe(400);
    expect((await a.e.propietario().get(RUTA)).cuerpo.asunto).toBe(ajustes.asunto);
  });

  it('un texto con enlaces, dominios o correos se rechaza', async () => {
    for (const mensaje of [
      'Baje su recibo en http://x.gt',
      'Entre a www.banco.com',
      'Escriba a pagos@x.gt',
      'Vea banco.com',
    ]) {
      expect((await a.e.propietario().put(RUTA, { ...ajustes, mensaje })).estado).toBe(400);
    }
  });

  it('cada cambio deja en la auditoría los valores de antes y de después, y quien no cambia nada no deja rastro', async () => {
    const nuevo = { ...ajustes, asunto: 'Nuevo {numero}' };
    expect((await a.e.propietario().put(RUTA, ajustes)).estado).toBe(200);
    const sql =
      "select anterior from core.auditoria where recurso = 'cuentas-por-pagar.avisos-de-pago' and accion = 'configurar' and empresa_id = $1";
    const { empresaId } = a.e.mundo.escenario.cuenta;
    const leer = () => comoPropietario<{ anterior: any }>(sql, [empresaId]);
    const previas = (await leer()).length;
    expect((await a.e.propietario().put(RUTA, nuevo)).estado).toBe(200);
    const filas = await leer();
    expect(filas).toHaveLength(previas + 1);
    expect(filas.at(-1)!.anterior.antes.asunto).toBe(ajustes.asunto);
    expect(filas.at(-1)!.anterior.despues.asunto).toBe('Nuevo {numero}');
    expect((await a.e.propietario().put(RUTA, nuevo)).estado).toBe(200);
    expect(await leer()).toHaveLength(previas + 1);
  });

  it('sin el permiso, ni se ven ni se guardan', async () => {
    expect((await a.soloVer.get(RUTA)).estado).toBe(403);
    expect((await a.soloVer.put(RUTA, ajustes)).estado).toBe(403);
  });
});
