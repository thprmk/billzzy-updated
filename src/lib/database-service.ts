// lib/database-service.ts
import { PrismaClient } from '@prisma/client';

export class DatabaseService {
    private static instance: DatabaseService;
    private prisma: PrismaClient;
    private connectionCount: number = 0;
    private readonly MAX_CONNECTIONS = 10;
    private readonly CONNECTION_TIMEOUT = 5000;
    private readonly TRANSACTION_TIMEOUT = 10000;

    private constructor() {
        this.prisma = new PrismaClient({
            log: ['error', 'warn'],
            datasources: {
                db: {
                    url: process.env.DATABASE_URL
                }
            }
        });
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    async executeTransaction<T>(operation: () => Promise<T>): Promise<T> {
        try {
            if (this.connectionCount >= this.MAX_CONNECTIONS) {
                await this.waitForConnection();
            }

            this.connectionCount++;
            const result = await this.prisma.$transaction(
                operation,
                {
                    maxWait: this.CONNECTION_TIMEOUT,
                    timeout: this.TRANSACTION_TIMEOUT
                }
            );
            return result;
        } finally {
            this.connectionCount--;
        }
    }

    private async waitForConnection(): Promise<void> {
        const startTime = Date.now();
        while (this.connectionCount >= this.MAX_CONNECTIONS) {
            if (Date.now() - startTime > this.CONNECTION_TIMEOUT) {
                throw new Error('Connection timeout: Too many concurrent connections');
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    getPrisma(): PrismaClient {
        return this.prisma;
    }

    async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
    }
}