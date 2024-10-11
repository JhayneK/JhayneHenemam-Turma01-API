import { expect } from '@jest/globals';
import pactum from 'pactum';

// Testes de Integração - Cadastro de Mercado - Método POST

describe('API Integration - Cadastro de Novo Mercado', () => {
  const apiEndpoint = 'https://api-desafio-qa.onrender.com/mercado';
  const timeout = 5000; // 5 segundos

  beforeAll(() => {
    pactum.request.setDefaultTimeout(timeout);
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

  test('Cadastra um novo mercado com sucesso', async () => {
    const novoMercado = {
      nome: "Moni",
      cnpj: "12345678912123",
      endereco: "Rua 1"
    };

    const response = await pactum.spec()
      .post(apiEndpoint)
      .withJson(novoMercado)
      .expectStatus(201)
      .expectJsonLike({
        id: expect.any(Number),
        nome: novoMercado.nome,
        cnpj: novoMercado.cnpj,
        endereco: novoMercado.endereco
      });

    expect(response.json).toEqual(expect.objectContaining({
      id: expect.any(Number),
      nome: expect.any(String),
      cnpj: expect.any(String),
      endereco: expect.any(String)
    }));

    expect(response.responseTime).toBeLessThan(timeout);
  });

  test('Tenta cadastrar mercado com dados inválidos', async () => {
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
      });
  });

  test('Tenta cadastrar mercado com CNPJ duplicado', async () => {
    const mercadoDuplicado = {
      nome: "Mercado Teste",
      cnpj: "12345678912123",
      endereco: "Rua Teste"
    };

    await pactum.spec()
      .post(apiEndpoint)
      .withJson(mercadoDuplicado)
      .expectStatus(409)
      .expectJsonLike({
        message: expect.stringContaining('CNPJ')
      });
  });

  test('Verifica resposta para método não permitido', async () => {
    await pactum.spec()
      .delete(apiEndpoint)
      .expectStatus(405);
  });

  test('Verifica resposta para rota não existente', async () => {
    await pactum.spec()
      .get(`${apiEndpoint}/naoexiste`)
      .expectStatus(404);
  });

  test('Simula timeout do servidor', async () => {
    jest.setTimeout(10000); // Aumenta o timeout do Jest para este teste
    
    await expect(pactum.spec()
      .get(apiEndpoint)
      .withRequestTimeout(1) // Simula um timeout muito curto
    ).rejects.toThrow();
  });
});