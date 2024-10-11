import { expect } from '@jest/globals';
import pactum from 'pactum';
import { SimpleReporter } from '../simple-reporter';
import { faker } from '@faker-js/faker';
import { StatusCodes } from 'http-status-codes';

describe('API Integration Tests - Consulta de Mercado por ID', () => {
  const apiEndpoint = 'https://api-desafio-qa.onrender.com/mercado';
  const timeout = 10000; // 10 segundos
  let createdMercadoId: number;
  class SimpleReporter{
    constructor() {}
  }

  beforeAll(() => {
    pactum.request.setDefaultTimeout(timeout);
    pactum.reporter.add(new SimpleReporter());
  });

  beforeEach(async () => {
    // Verifica se o servidor está respondendo antes de cada teste
    try {
      await pactum.spec()
        .get(apiEndpoint)
        .expectStatus(200);
    } catch (error) {
      console.error('Servidor não está respondendo:', error);
      throw new Error('Servidor API não está disponível');
    }
  });

  // Cria um novo mercado para ser usado nos testes
  beforeAll(async () => {
    const novoMercado = {
      nome: faker.company.name(),
      cnpj: faker.string.numeric(14),
      endereco: faker.location.streetAddress()
    };

    const response = await pactum.spec()
      .post(apiEndpoint)
      .withJson(novoMercado)
      .expectStatus(201);

    createdMercadoId = response.body.id;
  });

  describe('Testes de GET para mercado por ID', () => {
    test('1. Consulta mercado por ID válido', async () => {
      await pactum.spec()
        .get(`${apiEndpoint}/${createdMercadoId}`)
        .expectStatus(200)
        .expectJsonLike({
          id: createdMercadoId,
          nome: expect.any(String),
          cnpj: expect.any(String),
          endereco: expect.any(String)
        })
        .expectResponseTime(timeout);
    });

    test('2. Verifica tipos de dados na resposta', async () => {
      const response = await pactum.spec()
        .get(`${apiEndpoint}/${createdMercadoId}`)
        .expectStatus(200)
        .expectResponseTime(timeout);

      expect(response.body).toEqual({
        id: expect.any(Number),
        nome: expect.any(String),
        cnpj: expect.any(String),
        endereco: expect.any(String),
        produtos: expect.any(Object)
      });
    });

    test('3. Consulta mercado com ID inexistente', async () => {
      const invalidId = 999999;
      await pactum.spec()
        .get(`${apiEndpoint}/${invalidId}`)
        .expectStatus(404)
        .expectJsonLike({
          message: expect.stringContaining('not found')
        })
        .expectResponseTime(timeout);
    });

    test('4. Consulta mercado com ID inválido (não numérico)', async () => {
      await pactum.spec()
        .get(`${apiEndpoint}/invalidId`)
        .expectStatus(400)
        .expectJsonLike({
          message: expect.any(String)
        })
        .expectResponseTime(timeout);
    });

    test('5. Verifica cabeçalhos da resposta', async () => {
      await pactum.spec()
        .get(`${apiEndpoint}/${createdMercadoId}`)
        .expectStatus(200)
        .expectHeader('content-type', /application\/json/)
        .expectResponseTime(timeout);
    });
  });

  describe('Testes de resiliência e erro', () => {
    test('6. Simula timeout do servidor', async () => {
      jest.setTimeout(15000); // Aumenta o timeout do Jest para este teste
      
      await expect(pactum.spec()
        .get(`${apiEndpoint}/${createdMercadoId}`)
        .withRequestTimeout(1) // Simula um timeout muito curto
      ).rejects.toThrow();
    });

    test('7. Testa limite de requisições (rate limiting)', async () => {
      const requests = Array(50).fill(null).map(() => 
        pactum.spec()
          .get(`${apiEndpoint}/${createdMercadoId}`)
          .returns((res) => res.statusCode < 500) // Aceita 429 (Too Many Requests) ou 200
      );
    
      await Promise.all(requests);
    });

    test('8. Verifica comportamento com servidor indisponível', async () => {
      const invalidEndpoint = 'https://api-invalid-endpoint.com/mercado';
      
      await pactum.spec()
        .get(`${invalidEndpoint}/${createdMercadoId}`)
        .returns((res) => res.statusCode >= 500) // Espera um erro do servidor
        .expectResponseTime(timeout);
    });

  describe('Testes adicionais', () => {
    test('9. Verifica consistência dos dados em múltiplas requisições', async () => {
      const responses = await Promise.all(
        Array(5).fill(null).map(() => 
          pactum.spec()
            .get(`${apiEndpoint}/${createdMercadoId}`)
            .expectStatus(200)
        )
      );

      const firstResponse = responses[0].body;
      responses.forEach(response => {
        expect(response.body).toEqual(firstResponse);
      });
    });

    test('10. Verifica performance da API', async () => {
      const start = Date.now();
      await pactum.spec()
        .get(`${apiEndpoint}/${createdMercadoId}`)
        .expectStatus(200);
      const end = Date.now();
      const duration = end - start;

      expect(duration).toBeLessThan(timeout);
      console.log(`Tempo de resposta: ${duration}ms`);
    });
  });
)});