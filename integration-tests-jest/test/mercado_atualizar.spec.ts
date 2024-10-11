import { expect } from '@jest/globals';
import pactum from 'pactum';
import { SimpleReporter } from '../simple-reporter';
import { faker } from '@faker-js/faker';
import { StatusCodes } from 'http-status-codes';

describe('API Integration Tests - Atualização de Mercado', () => {
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

  describe('Testes de PUT para atualização de mercado', () => {
    test('1. Atualiza mercado com dados válidos', async () => {
      const dadosAtualizados = {
        nome: faker.company.name(),
        cnpj: faker.string.numeric(14),
        endereco: faker.location.streetAddress()
      };

      await pactum.spec()
        .put(`${apiEndpoint}/${createdMercadoId}`)
        .withJson(dadosAtualizados)
        .expectStatus(200)
        .expectJsonLike({
          message: `Mercado com ID ${createdMercadoId} atualizado com sucesso.`,
          updatedMercado: {
            id: createdMercadoId,
            nome: dadosAtualizados.nome,
            cnpj: dadosAtualizados.cnpj,
            endereco: dadosAtualizados.endereco
          }
        })
        .expectResponseTime(timeout);
    });

    test('2. Verifica tipos de dados na resposta', async () => {
      const dadosAtualizados = {
        nome: faker.company.name(),
        cnpj: faker.string.numeric(14),
        endereco: faker.location.streetAddress()
      };

      const response = await pactum.spec()
        .put(`${apiEndpoint}/${createdMercadoId}`)
        .withJson(dadosAtualizados)
        .expectStatus(200)
        .expectResponseTime(timeout);

      expect(response.body).toEqual({
        message: expect.any(String),
        updatedMercado: {
          id: expect.any(Number),
          nome: expect.any(String),
          cnpj: expect.any(String),
          endereco: expect.any(String)
        }
      });
    });

    test('3. Tenta atualizar mercado com ID inexistente', async () => {
      const invalidId = 999999;
      const dadosAtualizados = {
        nome: faker.company.name(),
        cnpj: faker.string.numeric(14),
        endereco: faker.location.streetAddress()
      };

      await pactum.spec()
        .put(`${apiEndpoint}/${invalidId}`)
        .withJson(dadosAtualizados)
        .expectStatus(404)
        .expectJsonLike({
          message: expect.stringContaining('not found')
        })
        .expectResponseTime(timeout);
    });

    test('4. Tenta atualizar com dados inválidos', async () => {
      const dadosInvalidos = {
        nome: '',
        cnpj: '123', // CNPJ inválido
        endereco: ''
      };

      await pactum.spec()
        .put(`${apiEndpoint}/${createdMercadoId}`)
        .withJson(dadosInvalidos)
        .expectStatus(400)
        .expectJsonLike({
          message: expect.any(String)
        })
        .expectResponseTime(timeout);
    });

    test('5. Verifica cabeçalhos da resposta', async () => {
      const dadosAtualizados = {
        nome: faker.company.name(),
        cnpj: faker.string.numeric(14),
        endereco: faker.location.streetAddress()
      };

      await pactum.spec()
        .put(`${apiEndpoint}/${createdMercadoId}`)
        .withJson(dadosAtualizados)
        .expectStatus(200)
        .expectHeader('content-type', /application\/json/)
        .expectResponseTime(timeout);
    });
  });

  describe('Testes de resiliência e erro', () => {
    test('6. Simula timeout do servidor', async () => {
      jest.setTimeout(15000); // Aumenta o timeout do Jest para este teste
      
      const dadosAtualizados = {
        nome: faker.company.name(),
        cnpj: faker.string.numeric(14),
        endereco: faker.location.streetAddress()
      };

      await expect(pactum.spec()
        .put(`${apiEndpoint}/${createdMercadoId}`)
        .withJson(dadosAtualizados)
        .withRequestTimeout(1) // Simula um timeout muito curto
      ).rejects.toThrow();
    });

    test('7. Testa limite de requisições (rate limiting)', async () => {
      const dadosAtualizados = {
        nome: faker.company.name(),
        cnpj: faker.string.numeric(14),
        endereco: faker.location.streetAddress()
      };

      const requests = Array(50).fill(null).map(() =>
        pactum.spec()
          .put(`${apiEndpoint}/${createdMercadoId}`)
          .withJson(dadosAtualizados)
          .expect((res) => {
            const validStatuses = [200, 429];
            if (!validStatuses.includes(res.statusCode)) {
              throw new Error(`Status inesperado: ${res.statusCode}`); // Aceita 429 (Too Many Requests) ou 200
            }
          })
    );

      await Promise.all(requests);
    });

    test('8. Verifica comportamento com servidor indisponível', async () => {
      const invalidEndpoint = 'https://api-invalid-endpoint.com/mercado';
      const dadosAtualizados = {
        nome: faker.company.name(),
        cnpj: faker.string.numeric(14),
        endereco: faker.location.streetAddress()
      };
      
      await pactum.spec()
        .put(`${invalidEndpoint}/${createdMercadoId}`)
        .withJson(dadosAtualizados)
        .expectStatus((status) => status >= 500) // Espera um erro do servidor
        .expectResponseTime(timeout);
    });
  });

  describe('Testes adicionais', () => {
    test('9. Verifica consistência dos dados após atualização', async () => {
      const dadosAtualizados = {
        nome: faker.company.name(),
        cnpj: faker.string.numeric(14),
        endereco: faker.location.streetAddress()
      };

      await pactum.spec()
        .put(`${apiEndpoint}/${createdMercadoId}`)
        .withJson(dadosAtualizados)
        .expectStatus(200);

      const getResponse = await pactum.spec()
        .get(`${apiEndpoint}/${createdMercadoId}`)
        .expectStatus(200);

      expect(getResponse.body).toMatchObject(dadosAtualizados);
    });

    test('10. Verifica performance da API', async () => {
      const dadosAtualizados = {
        nome: faker.company.name(),
        cnpj: faker.string.numeric(14),
        endereco: faker.location.streetAddress()
      };

      const start = Date.now();
      await pactum.spec()
        .put(`${apiEndpoint}/${createdMercadoId}`)
        .withJson(dadosAtualizados)
        .expectStatus(200);
      const end = Date.now();
      const duration = end - start;

      expect(duration).toBeLessThan(timeout);
      console.log(`Tempo de resposta: ${duration}ms`);
    });
  });
});