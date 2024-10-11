import { expect } from '@jest/globals';
import pactum from 'pactum';
import { SimpleReporter } from '../simple-reporter';
import { faker } from '@faker-js/faker';
import { StatusCodes } from 'http-status-codes';

describe('API Integration Tests', () => {
  const apiEndpoint = 'https://api-desafio-qa.onrender.com/mercado';
  const timeout = 10000; // 10 segundos
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

  describe('Testes de GET', () => {
    test('1. Verifica resposta com status 200', async () => {
      await pactum.spec()
        .get(apiEndpoint)
        .expectStatus(200)
        .expectResponseTime(timeout);
    });

    test('2. Verifica se a resposta contém a chave "cnpj"', async () => {
      await pactum.spec()
        .get(apiEndpoint)
        .expectStatus(200)
        .expectJsonLike([{ "cnpj": /.+/ }])
        .expectResponseTime(timeout);
    });

    test('3. Verifica estrutura de produtos do primeiro supermercado', async () => {
      await pactum.spec()
        .get(apiEndpoint)
        .expectStatus(200)
        .expectJsonLike([{ "produtos": { "acougue": expect.any(Array), "bebidas": expect.any(Array), "congelados": expect.any(Array) } }])
        .expectResponseTime(timeout);
    });

    // ... (outros testes GET existentes) ...

    test('15. Verifica preço de "Salmão" na categoria "peixes" como 40', async () => {
      await pactum.spec()
        .get(apiEndpoint)
        .expectStatus(200)
        .expectJsonMatch(`[0].produtos.peixaria[0].peixes[0].preco`, { eq: 40 })
        .expectResponseTime(timeout);
    });
  });

  describe('Testes de POST', () => {
    test('16. Cadastra um novo mercado com sucesso', async () => {
      const novoMercado = {
        nome: faker.company.name(),
        cnpj: faker.string.numeric(14),
        endereco: faker.location.streetAddress()
      };

      await pactum.spec()
        .post(apiEndpoint)
        .withJson(novoMercado)
        .expectStatus(201)
        .expectJsonLike({
          id: expect.any(Number),
          nome: novoMercado.nome,
          cnpj: novoMercado.cnpj,
          endereco: novoMercado.endereco
        })
        .expectResponseTime(timeout);
    });

    test('17. Tenta cadastrar mercado com dados inválidos', async () => {
      const mercadoInvalido = {
        nome: "",
        cnpj: "123",
        endereco: ""
      };

      await pactum.spec()
        .post(apiEndpoint)
        .withJson(mercadoInvalido)
        .expectStatus(400)
        .expectJsonLike({
          message: expect.any(String)
        })
        .expectResponseTime(timeout);
    });

    test('18. Tenta cadastrar mercado com CNPJ duplicado', async () => {
      const mercadoDuplicado = {
        nome: faker.company.name(),
        cnpj: "92023163097306", // CNPJ já existente
        endereco: faker.location.streetAddress()
      };

      await pactum.spec()
        .post(apiEndpoint)
        .withJson(mercadoDuplicado)
        .expectStatus(409)
        .expectJsonLike({
          message: expect.stringContaining('CNPJ')
        })
        .expectResponseTime(timeout);
    });
  });

  describe('Testes de erro e resiliência', () => {
    test('19. Verifica resposta para método não permitido', async () => {
      await pactum.spec()
        .delete(apiEndpoint)
        .expectStatus(405)
        .expectResponseTime(timeout);
    });

    test('20. Verifica resposta para rota não existente', async () => {
      await pactum.spec()
        .get(`${apiEndpoint}/naoexiste`)
        .expectStatus(404)
        .expectResponseTime(timeout);
    });

    test('21. Simula timeout do servidor', async () => {
      jest.setTimeout(15000); // Aumenta o timeout do Jest para este teste
      
      await expect(pactum.spec()
        .get(apiEndpoint)
        .withRequestTimeout(1) // Simula um timeout muito curto
      ).rejects.toThrow();
    });

    test('22. Testa limite de requisições (rate limiting)', async () => {
      const requests = Array(100).fill(null).map(() => 
        pactum.spec()
          .get(apiEndpoint)
          .expectStatus((status) => status < 500) // Aceita 429 (Too Many Requests) ou 200
      );

      await Promise.all(requests);
    });
  });

  describe('Verificações adicionais', () => {
    test('23. Verifica tipos de dados em todas as respostas', async () => {
      const response = await pactum.spec()
        .get(apiEndpoint)
        .expectStatus(200)
        .expectResponseTime(timeout);

      response.body.forEach((mercado: any) => {
        expect(mercado.id).toEqual(expect.any(Number));
        expect(mercado.nome).toEqual(expect.any(String));
        expect(mercado.cnpj).toEqual(expect.any(String));
        expect(mercado.endereco).toEqual(expect.any(String));
        if (mercado.produtos) {
          expect(mercado.produtos).toEqual(expect.any(Object));
        }
      });
    });

    test('24. Verifica cabeçalhos da resposta', async () => {
      await pactum.spec()
        .get(apiEndpoint)
        .expectStatus(200)
        .expectHeader('content-type', /application\/json/)
        .expectResponseTime(timeout);
    });
  });
});