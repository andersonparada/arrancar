import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PdfNoSePudoRevisar } from '../../dominio/documento.js';
import { EjecutorDeQpdf, LIMITES_DE_QPDF } from './ejecutor-de-qpdf.js';
import { verificarQpdf, versionDeQpdf } from './verificador-de-qpdf.js';
import { hayQpdf, RUTA_QPDF_DE_PRUEBA } from '../../pruebas/soporte-de-qpdf.js';

const hayPrlimit = existsSync('/usr/bin/prlimit') && existsSync('/usr/bin/sleep') && existsSync('/usr/bin/yes');
const conPrlimit = it.skipIf(!hayPrlimit);

describe('ejecutor de qpdf: límites del proceso', () => {
  conPrlimit('mata el proceso que pasa del tiempo límite y responde con error propio', async () => {
    const ejecutor = new EjecutorDeQpdf('/usr/bin/sleep', { ...LIMITES_DE_QPDF, tiempoEnMilisegundos: 200 });

    await expect(ejecutor.ejecutar(['5'])).rejects.toBeInstanceOf(PdfNoSePudoRevisar);
  });

  conPrlimit('corta al proceso que llena la salida más de lo permitido', async () => {
    const ejecutor = new EjecutorDeQpdf('/usr/bin/yes', { ...LIMITES_DE_QPDF, salidaMaximaEnBytes: 1024 });

    await expect(ejecutor.ejecutar([])).rejects.toBeInstanceOf(PdfNoSePudoRevisar);
  });

  conPrlimit('devuelve el código de salida sin fallar cuando el programa termina por su cuenta', async () => {
    const ejecutor = new EjecutorDeQpdf('/usr/bin/sleep', LIMITES_DE_QPDF);

    expect((await ejecutor.ejecutar(['0'])).codigo).toBe(0);
    expect((await ejecutor.ejecutar(['no-es-un-numero'])).codigo).toBe(1);
  });

  conPrlimit('un programa que no existe termina con código de error, no con éxito', async () => {
    const ejecutor = new EjecutorDeQpdf('/no/existe/qpdf');

    const codigo = await ejecutor.ejecutar(['--version']).then((r) => r.codigo);

    expect(codigo).not.toBe(0);
  });
});

describe('verificador de qpdf', () => {
  it('lee la versión de la salida de qpdf', () => {
    expect(versionDeQpdf('qpdf version 11.3.0\nRun qpdf --copyright')).toBe('11.3.0');
    expect(versionDeQpdf('otra cosa')).toBeNull();
  });

  it('avisa con la variable a cambiar cuando no encuentra qpdf', async () => {
    await expect(verificarQpdf('/no/existe/qpdf')).rejects.toThrow('RUTA_QPDF');
  });

  it.skipIf(!hayQpdf)('acepta el qpdf 11 o posterior instalado', async () => {
    expect(Number.parseInt(await verificarQpdf(RUTA_QPDF_DE_PRUEBA), 10)).toBeGreaterThanOrEqual(11);
  });
});
