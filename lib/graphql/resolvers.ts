import { prisma } from '@/lib/db';

export const resolvers = {
  Query: {
    messages: async () => {
      return await prisma.message.findMany({
        include: { author: true },
        orderBy: { createdAt: 'desc' },
      });
    },
    message: async (_: any, { id }: { id: string }) => {
      return await prisma.message.findUnique({
        where: { id },
        include: { author: true },
      });
    },
    users: async () => {
      return await prisma.user.findMany();
    },
  },
  Mutation: {
    createMessage: async (_: any, { text, authorId }: { text: string; authorId?: string }) => {
      return await prisma.message.create({
        data: { text, authorId },
        include: { author: true },
      });
    },
    deleteMessage: async (_: any, { id }: { id: string }) => {
      await prisma.message.delete({ where: { id } });
      return true;
    },
  },
  Message: {
    author: async (message: any) => {
      if (!message.authorId) return null;
      return await prisma.user.findUnique({
        where: { id: message.authorId },
      });
    },
  },
};
