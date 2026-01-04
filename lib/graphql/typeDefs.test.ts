import { typeDefs } from './typeDefs';

describe('GraphQL TypeDefs', () => {
  it('exports typeDefs as a string', () => {
    expect(typeof typeDefs).toBe('string');
  });

  it('defines User type', () => {
    expect(typeDefs).toContain('type User');
    expect(typeDefs).toContain('id: ID!');
    expect(typeDefs).toContain('email: String!');
    expect(typeDefs).toContain('name: String');
  });

  it('defines Message type', () => {
    expect(typeDefs).toContain('type Message');
    expect(typeDefs).toContain('id: ID!');
    expect(typeDefs).toContain('text: String!');
    expect(typeDefs).toContain('author: User');
    expect(typeDefs).toContain('createdAt: String!');
  });

  it('defines Query type with all queries', () => {
    expect(typeDefs).toContain('type Query');
    expect(typeDefs).toContain('messages: [Message!]!');
    expect(typeDefs).toContain('message(id: ID!): Message');
    expect(typeDefs).toContain('users: [User!]!');
  });

  it('defines Mutation type with all mutations', () => {
    expect(typeDefs).toContain('type Mutation');
    expect(typeDefs).toContain('createMessage(text: String!, authorId: ID): Message!');
    expect(typeDefs).toContain('deleteMessage(id: ID!): Boolean!');
  });

  it('is valid GraphQL schema syntax', () => {
    // Check for basic GraphQL syntax validity
    expect(typeDefs).not.toContain('undefined');
    expect(typeDefs).toMatch(/type\s+\w+\s+{/g);
  });
});
