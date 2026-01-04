/**
 * @jest-environment node
 */
import { resolvers } from './resolvers';
import { prisma } from '@/lib/db';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('GraphQL Resolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query resolvers', () => {
    it('users resolver returns all users', async () => {
      const mockUsers = [
        { id: '1', email: 'test@example.com', name: 'Test User' },
        { id: '2', email: 'user@example.com', name: 'Another User' },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await resolvers.Query.users();

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });

    it('messages resolver returns all messages', async () => {
      const mockMessages = [
        { id: '1', text: 'Hello', authorId: '1', createdAt: new Date() },
        { id: '2', text: 'World', authorId: '2', createdAt: new Date() },
      ];

      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const result = await resolvers.Query.messages();

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        include: { author: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockMessages);
    });
    it('message resolver returns single message by id', async () => {
      const mockMessage = { id: '1', text: 'Test', authorId: '1', createdAt: new Date() };

      (prisma.message.findUnique as jest.Mock).mockResolvedValue(mockMessage);

      const result = await resolvers.Query.message(null, { id: '1' });

      expect(prisma.message.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { author: true },
      });
      expect(result).toEqual(mockMessage);
    });
  });

  describe('Mutation resolvers', () => {
    it('createMessage creates a new message', async () => {
      const mockMessage = {
        id: '1',
        text: 'New message',
        authorId: '1',
        createdAt: new Date(),
      };

      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);

      const result = await resolvers.Mutation.createMessage(null, {
        text: 'New message',
        authorId: '1',
      });

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          text: 'New message',
          authorId: '1',
        },
        include: { author: true },
      });
      expect(result).toEqual(mockMessage);
    });
    it('deleteMessage deletes a message by id', async () => {
      (prisma.message.delete as jest.Mock).mockResolvedValue(true);

      const result = await resolvers.Mutation.deleteMessage(null, { id: '1' });

      expect(prisma.message.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toBe(true);
    });
  });

  describe('Message type resolver', () => {
    it('author resolver returns user for a message', async () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
      const mockMessage = { id: '1', text: 'Test', authorId: '1', createdAt: new Date() };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await resolvers.Message.author(mockMessage);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(mockUser);
    });

    it('author resolver returns null for missing authorId', async () => {
      const mockMessage = { id: '1', text: 'Test', authorId: null, createdAt: new Date() };

      const result = await resolvers.Message.author(mockMessage);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});
