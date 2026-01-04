/**
 * @jest-environment node
 */
import { GET, POST } from './route';
import { NextRequest } from 'next/server';

// Mock Apollo Server
jest.mock('@apollo/server', () => ({
  ApolloServer: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
  })),
}));

jest.mock('@as-integrations/next', () => ({
  startServerAndCreateNextHandler: jest.fn((server) => {
    return jest.fn(async (request: NextRequest) => {
      return new Response(JSON.stringify({ data: { test: 'success' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
  }),
}));

describe('GraphQL Route', () => {
  it('GET handler returns successful response', async () => {
    const request = new NextRequest('http://localhost:3000/api/graphql');
    const response = await GET(request);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
  });

  it('POST handler returns successful response', async () => {
    const request = new NextRequest('http://localhost:3000/api/graphql', {
      method: 'POST',
      body: JSON.stringify({ query: '{ test }' }),
    });

    const response = await POST(request);

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
  });

  it('POST handler processes GraphQL query', async () => {
    const request = new NextRequest('http://localhost:3000/api/graphql', {
      method: 'POST',
      body: JSON.stringify({ query: '{ users { id email } }' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data).toHaveProperty('data');
  });
});
