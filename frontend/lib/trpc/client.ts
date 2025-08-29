import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from './server-real';

export const trpc = createTRPCReact<AppRouter>();