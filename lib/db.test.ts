/**
 * @jest-environment node
 */
import { prisma } from './db';

describe('Prisma Client', () => {
  it('exports prisma client instance', () => {
    expect(prisma).toBeDefined();
  });

  it('has user model', () => {
    expect(prisma.user).toBeDefined();
    expect(typeof prisma.user.findMany).toBe('function');
    expect(typeof prisma.user.findUnique).toBe('function');
    expect(typeof prisma.user.create).toBe('function');
  });

  it('has message model', () => {
    expect(prisma.message).toBeDefined();
    expect(typeof prisma.message.findMany).toBe('function');
    expect(typeof prisma.message.findUnique).toBe('function');
    expect(typeof prisma.message.create).toBe('function');
    expect(typeof prisma.message.delete).toBe('function');
  });

  it('is a singleton instance', () => {
    const { prisma: prisma2 } = require('./db');
    expect(prisma).toBe(prisma2);
  });
});
