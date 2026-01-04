export const typeDefs = `#graphql
  type User {
    id: ID!
    email: String!
    name: String
    messages: [Message!]!
  }

  type Message {
    id: ID!
    text: String!
    createdAt: String!
    author: User
    authorId: String
  }

  type Query {
    messages: [Message!]!
    message(id: ID!): Message
    users: [User!]!
  }

  type Mutation {
    createMessage(text: String!, authorId: ID): Message!
    deleteMessage(id: ID!): Boolean!
  }
`;
