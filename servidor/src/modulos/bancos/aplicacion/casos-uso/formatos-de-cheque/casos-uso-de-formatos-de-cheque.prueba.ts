import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { FormatoDeChequeEnUso, FormatoDeChequeInvalido } from '../../../dominio/errores-de-impresion.js';
import { FormatosDeChequeEnMemoria, LugarDeEmisionFijo } from '../../../pruebas/dobles-de-formatos-de-cheque.js';
import { ActualizarFormatoDeCheque } from './actualizar-formato-de-cheque.js';
import { ArmarPruebaDeAlineacion } from './armar-prueba-de-alineacion.js';
import { CambiarEstadoDeFormatoDeCheque } from './cambiar-estado-de-formato-de-cheque.js';
import { ObtenerFormatoDeCheque } from './consultar-formatos-de-cheque.js';
import { CrearFormatoDeCheque } from './crear-formato-de-cheque.js';
import { EliminarFormatoDeCheque } from './eliminar-formato-de-cheque.js';
import { MarcarFormatoDeChequeProbado } from './marcar-formato-de-cheque-probado.js';

const operador = operadorDePrueba();
let formatos: FormatosDeChequeEnMemoria;
let auditoria: AuditoriaEnMemoria;
let casos: ReturnType<typeof armar>;

function armar() {
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: formatos,
    consultas: formatos,
    auditoria,
    reloj: new RelojFijo('2026-11-18'),
    lugarDeEmision: new LugarDeEmisionFijo(),
  };
  return {
    crear: new CrearFormatoDeCheque(dependencias),
    actualizar: new ActualizarFormatoDeCheque(dependencias),
    estado: new CambiarEstadoDeFormatoDeCheque(dependencias),
    eliminar: new EliminarFormatoDeCheque(dependencias),
    probado: new MarcarFormatoDeChequeProbado(dependencias),
    obtener: new ObtenerFormatoDeCheque(dependencias),
    prueba: new ArmarPruebaDeAlineacion(dependencias),
  };
}

beforeEach(() => {
  formatos = new FormatosDeChequeEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  casos = armar();
});

const solicitud = (cambios: Record<string, unknown> = {}) => ({
  nombre: 'Banrural',
  base: 'cheque_suelto' as const,
  ajustes: {},
  ...cambios,
});

describe('crear y actualizar', () => {
  it('crea el formato con sus ajustes revisados', async () => {
    const creado = await casos.crear.ejecutar(
      operador,
      solicitud({ ajustes: { desplazamiento: { xMm: 2, yMm: -1 } } }),
    );

    expect(creado).toMatchObject({ nombre: 'Banrural', base: 'cheque_suelto', activo: true, probadoEn: null });
    const detalle = await casos.obtener.ejecutar(operador, creado.id);
    expect(detalle.resuelto?.desplazamiento).toEqual({ xMm: 2, yMm: -1 });
  });

  it('rechaza ajustes inválidos y un campo libre', async () => {
    await expect(casos.crear.ejecutar(operador, solicitud({ ajustes: { letra: { tamanoPt: 99 } } }))).rejects.toThrow(
      FormatoDeChequeInvalido,
    );
    await expect(
      casos.crear.ejecutar(
        operador,
        solicitud({ ajustes: { anotacion: { xMm: 1, yMm: 1, anchoMm: 5, visible: true } } }),
      ),
    ).rejects.toThrow(FormatoDeChequeInvalido);
  });

  it('al cambiar los ajustes pierde la prueba; solo el nombre, no', async () => {
    const creado = await casos.crear.ejecutar(operador, solicitud());
    await casos.probado.ejecutar(operador, creado.id);

    const soloNombre = await casos.actualizar.ejecutar(operador, {
      formatoId: creado.id,
      solicitud: solicitud({ nombre: 'Otro nombre' }),
    });
    expect(soloNombre.probadoEn).not.toBeNull();

    const conAjustes = await casos.actualizar.ejecutar(operador, {
      formatoId: creado.id,
      solicitud: solicitud({ nombre: 'Otro nombre', ajustes: { desplazamiento: { xMm: 3 } } }),
    });
    expect(conAjustes.probadoEn).toBeNull();
  });

  it('un formato que no existe no se actualiza', async () => {
    await expect(
      casos.actualizar.ejecutar(operador, { formatoId: crypto.randomUUID(), solicitud: solicitud() }),
    ).rejects.toThrow(RecursoNoEncontrado);
  });
});

describe('inactivar, reactivar y eliminar dejan auditoría', () => {
  it('inactivar y reactivar se auditan una vez cada uno', async () => {
    const { id } = await casos.crear.ejecutar(operador, solicitud());

    const inactivo = await casos.estado.ejecutar(operador, { formatoId: id, activo: false });
    const reactivado = await casos.estado.ejecutar(operador, { formatoId: id, activo: true });

    expect(inactivo.activo).toBe(false);
    expect(reactivado.activo).toBe(true);
    expect(auditoria.entradas.map((e) => [e.recurso, e.accion])).toEqual([
      ['bancos.formatos-de-cheque', 'inactivar'],
      ['bancos.formatos-de-cheque', 'reactivar'],
    ]);
  });

  it('elimina uno que ninguna chequera usa y lo audita con cómo estaba', async () => {
    const { id } = await casos.crear.ejecutar(operador, solicitud());

    await casos.eliminar.ejecutar(operador, { formatoId: id, motivo: 'Ya no se usa' });

    await expect(formatos.obtener(id)).rejects.toThrow(RecursoNoEncontrado);
    expect(auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'bancos.formatos-de-cheque',
        accion: 'eliminar',
        motivo: 'Ya no se usa',
        anterior: expect.objectContaining({ nombre: 'Banrural' }),
      }),
    ]);
  });

  it('uno que alguna chequera usa no se elimina: se inactiva', async () => {
    const { id } = await casos.crear.ejecutar(operador, solicitud());
    formatos.usos.set(id, 2);

    await expect(casos.eliminar.ejecutar(operador, { formatoId: id, motivo: 'Prueba' })).rejects.toThrow(
      FormatoDeChequeEnUso,
    );
    expect(auditoria.entradas).toEqual([]);
  });
});

describe('la prueba de alineación', () => {
  it('imprime los datos de muestra sin valor y avisa si el formato nunca se probó', async () => {
    const { id } = await casos.crear.ejecutar(operador, solicitud());

    const hoja = await casos.prueba.deUnFormato(operador, id);

    expect(hoja.probado).toBe(false);
    const beneficiario = hoja.cheque.campos.find((c) => c.clave === 'beneficiario')!;
    expect(beneficiario.texto.startsWith('PRUEBA — SIN VALOR*')).toBe(true);
    expect(hoja.cheque.campos.find((c) => c.clave === 'fecha')?.texto).toBe('Guatemala, 18 de noviembre de 2026');
    expect(hoja.reglaMm).toBe(10);
  });

  it('después de «quedó alineada» sale probado', async () => {
    const { id } = await casos.crear.ejecutar(operador, solicitud());
    await casos.probado.ejecutar(operador, id);

    expect((await casos.prueba.deUnFormato(operador, id)).probado).toBe(true);
  });

  it('una plantilla de fábrica sin formato propio siempre sale sin probar; una clave inventada no existe', async () => {
    const hoja = await casos.prueba.deUnaPlantilla(operador, 'voucher_carta_en_medio');

    expect(hoja).toMatchObject({ probado: false });
    await expect(casos.prueba.deUnaPlantilla(operador, 'de_otro_banco')).rejects.toThrow(RecursoNoEncontrado);
  });
});
