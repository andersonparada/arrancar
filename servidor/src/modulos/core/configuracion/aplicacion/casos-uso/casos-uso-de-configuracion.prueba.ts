import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { RecursoNoEncontrado } from '../../../compartido/aplicacion/errores.js';
import { definirConfiguracion } from '../../../modulos-sistema/definicion-modulo.js';
import { NivelNoPermitido, ValorDeConfiguracionInvalido } from '../../dominio/errores.js';
import {
  CatalogoFijo,
  InstalacionFija,
  RepositorioConfiguracionesEnMemoria,
} from '../../pruebas/dobles-de-configuracion.js';
import { LectorDeConfiguracion } from '../lector-de-configuracion.js';
import { EstablecerValor } from './establecer-valor.js';
import { ListarVariablesEditables } from './listar-variables-editables.js';
import { RestablecerValor } from './restablecer-valor.js';

const diasDeAviso = definirConfiguracion({
  clave: 'ganado.avisos.dias',
  descripcion: 'Días de anticipación de los avisos.',
  esquema: z.number().int().min(1),
  predeterminado: 30,
  niveles: ['instalacion', 'cuenta', 'empresa'],
  publica: true,
});
const nombreDelServidor = definirConfiguracion({
  clave: 'core.interfaz.nombre',
  descripcion: 'Nombre de la instalación.',
  esquema: z.string(),
  predeterminado: 'Arrancar',
  niveles: ['instalacion'],
});

const alcance = {
  destino: { cuentaId: crypto.randomUUID(), empresaId: crypto.randomUUID() },
  modulosActivos: new Set(['core', 'ganado']),
};
const usuarioId = crypto.randomUUID();

let repositorio: RepositorioConfiguracionesEnMemoria;
let lector: LectorDeConfiguracion;
let establecer: EstablecerValor;
let restablecer: RestablecerValor;

beforeEach(() => {
  repositorio = new RepositorioConfiguracionesEnMemoria();
  const catalogo = new CatalogoFijo({ core: [nombreDelServidor], ganado: [diasDeAviso] });
  const instalacion = new InstalacionFija({ 'ganado.avisos.dias': 15 });
  lector = new LectorDeConfiguracion({ repositorio, catalogo, instalacion });
  establecer = new EstablecerValor({ repositorio, catalogo });
  restablecer = new RestablecerValor({ repositorio, catalogo });
});

const efectivo = () => lector.obtener<number>(diasDeAviso.clave, alcance.destino);

describe('valor efectivo', () => {
  it('sin valores guardados usa el del archivo de instalación', async () => {
    expect(await efectivo()).toBe(15);
  });

  it('el de la empresa gana al de la cuenta, y al restablecerlo vuelve el de la cuenta', async () => {
    await establecer.ejecutar({ ...alcance, clave: diasDeAviso.clave, nivel: 'cuenta', valor: 20, usuarioId });
    await establecer.ejecutar({ ...alcance, clave: diasDeAviso.clave, nivel: 'empresa', valor: 7, usuarioId });
    const conEmpresa = await efectivo();
    await restablecer.ejecutar({ ...alcance, clave: diasDeAviso.clave, nivel: 'empresa' });

    expect(conEmpresa).toBe(7);
    expect(await efectivo()).toBe(20);
  });

  it('solo envía al navegador las variables públicas', async () => {
    const publicos = await lector.valoresPublicos(alcance);

    expect(publicos).toEqual({ 'ganado.avisos.dias': 15 });
  });
});

describe('cambiar un valor', () => {
  it('rechaza un nivel que la variable no admite', async () => {
    const cambio = { ...alcance, clave: nombreDelServidor.clave, nivel: 'cuenta' as const, valor: 'Otro', usuarioId };

    await expect(establecer.ejecutar(cambio)).rejects.toThrow(NivelNoPermitido);
  });

  it('rechaza un valor que no cumple el esquema', async () => {
    const cambio = { ...alcance, clave: diasDeAviso.clave, nivel: 'cuenta' as const, valor: 0, usuarioId };

    await expect(establecer.ejecutar(cambio)).rejects.toThrow(ValorDeConfiguracionInvalido);
  });

  it('no encuentra las variables de un módulo que la cuenta no tiene', async () => {
    const sinGanado = { ...alcance, modulosActivos: new Set(['core']) };

    await expect(
      establecer.ejecutar({ ...sinGanado, clave: diasDeAviso.clave, nivel: 'cuenta', valor: 5, usuarioId }),
    ).rejects.toThrow(RecursoNoEncontrado);
  });
});

it('la cuenta solo ve las variables que puede cambiar', async () => {
  const variables = await new ListarVariablesEditables({ lector }).ejecutar(alcance);

  expect(variables.map((v) => v.clave)).toEqual([diasDeAviso.clave]);
});
