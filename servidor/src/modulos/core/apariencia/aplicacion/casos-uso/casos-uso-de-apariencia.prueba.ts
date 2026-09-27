import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../compartido/aplicacion/errores.js';
import { AlmacenamientoEnMemoria } from '../../../compartido/pruebas/dobles-compartidos.js';
import { FormatoDeLogoNoAceptado, RUTA_DEL_LOGO } from '../../dominio/logo.js';
import {
  AjustesEnMemoria,
  APARIENCIA_DE_ARRANCAR,
  ConvertidorDeLogoFalso,
} from '../../pruebas/dobles-de-apariencia.js';
import { AbrirLogo } from './abrir-logo.js';
import { CambiarApariencia } from './cambiar-apariencia.js';
import { CambiarLogo } from './cambiar-logo.js';
import { QuitarLogo } from './quitar-logo.js';
import { RestablecerApariencia } from './restablecer-apariencia.js';

const soporte = crypto.randomUUID();
const logo = { contenido: Buffer.from('logo'), nombreOriginal: 'logo.svg', tipoMime: 'image/svg+xml' };
const miRancho = { nombreAplicacion: 'Mi Rancho', colorPrincipal: '#1d3557', colorAcento: '#f1faee' };

let ajustes: AjustesEnMemoria;
let almacenamiento: AlmacenamientoEnMemoria;
let cambiarLogo: CambiarLogo;

beforeEach(() => {
  ajustes = new AjustesEnMemoria();
  almacenamiento = new AlmacenamientoEnMemoria();
  cambiarLogo = new CambiarLogo({ ajustes, almacenamiento, convertidor: new ConvertidorDeLogoFalso() });
});

describe('nombre y colores', () => {
  it('se cambian a nombre de soporte y se pueden restablecer sin tocar el logo', async () => {
    await cambiarLogo.ejecutar(logo, soporte);
    const cambiada = await new CambiarApariencia({ ajustes }).ejecutar(miRancho, soporte);
    const restablecida = await new RestablecerApariencia({ ajustes }).ejecutar();

    expect(cambiada).toMatchObject(miRancho);
    expect(ajustes.guardadosPor).toContain(soporte);
    expect(restablecida).toMatchObject({ nombreAplicacion: APARIENCIA_DE_ARRANCAR.nombreAplicacion });
    expect(restablecida.urlLogo).not.toBeNull();
  });
});

describe('logo', () => {
  it('se guarda convertido y la apariencia apunta a su versión', async () => {
    const apariencia = await cambiarLogo.ejecutar(logo, soporte);

    expect(almacenamiento.contenidos.get(RUTA_DEL_LOGO)?.toString()).toBe('png:logo');
    expect(apariencia.urlLogo).toMatch(/^\/api\/apariencia\/logo\?v=\w+$/);
  });

  it('rechaza lo que no es una imagen', async () => {
    const texto = { ...logo, tipoMime: 'text/plain' };

    await expect(cambiarLogo.ejecutar(texto, soporte)).rejects.toThrow(FormatoDeLogoNoAceptado);
  });

  it('al quitarlo vuelve el de Arrancar y ya no se puede abrir', async () => {
    await cambiarLogo.ejecutar(logo, soporte);

    const apariencia = await new QuitarLogo({ ajustes, almacenamiento }).ejecutar();

    expect(apariencia.urlLogo).toBeNull();
    await expect(new AbrirLogo({ almacenamiento }).ejecutar()).rejects.toThrow(RecursoNoEncontrado);
  });
});
