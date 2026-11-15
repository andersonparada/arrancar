import { describe, expect, it } from 'vitest';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { errorDelTipo, problemaDeError } from './errores-del-registro';

const error = (estado: number, codigo: string, ...resto: [mensaje: string, detalles?: unknown]) =>
  new ErrorApi(estado, { codigo, mensaje: resto[0], detalles: resto[1] });

describe('errores de la factura del sistema anterior', () => {
  it('cada uno sale en su campo, con el mensaje del servidor', () => {
    const casos: [string, string][] = [
      ['factura_anterior_sin_fecha_de_inicio', 'documentoAfectadoId'],
      ['factura_anterior_posterior_a_la_fecha_de_inicio', 'facturaAnterior.fechaEmision'],
      ['factura_anterior_muy_antigua', 'facturaAnterior.fechaEmision'],
      ['factura_anterior_esta_en_el_libro', 'facturaAnterior.numero'],
      ['factura_anterior_con_otros_datos', 'facturaAnterior.numero'],
      ['nota_recibida_antes_de_la_fecha_de_inicio', 'fechaRecepcion'],
      ['otra_causa_sin_detalle', 'observaciones'],
      ['otra_causa_solo_en_facturas', 'otraCausaSinCredito'],
    ];
    for (const [codigo, campo] of casos) {
      const delServidor = error(422, codigo, 'Explicación.');
      expect(errorDelTipo(delServidor)).toEqual({ [campo]: 'Explicación.' });
      expect(problemaDeError(delServidor)).toBeNull();
    }
  });

  it('un dato inválido de la factura anterior sale en el campo que dice el servidor', () => {
    const delServidor = error(422, 'factura_anterior_invalida', 'El total debe ser mayor que cero.', {
      campo: 'facturaAnterior.total',
    });
    expect(errorDelTipo(delServidor)).toEqual({ 'facturaAnterior.total': 'El total debe ser mayor que cero.' });
    expect(errorDelTipo(error(422, 'factura_anterior_invalida', 'Mal.'))).toEqual({ 'facturaAnterior.numero': 'Mal.' });
  });

  it('registrar una factura que una nota ya cita explica el camino y lleva a la nota', () => {
    const delServidor = error(409, 'factura_ya_es_del_sistema_anterior', 'Anule la nota 45 y vuelva a registrarla.', {
      notaId: 'n-1',
      campo: 'numero',
    });
    expect(problemaDeError(delServidor)).toEqual({
      tipo: 'cita_anterior',
      mensaje: 'Anule la nota 45 y vuelva a registrarla.',
      notaId: 'n-1',
    });
  });
});
