import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client'
import "./styles/global.css"
import { AppRouter } from './providers/AppRouter';
import { ZvonilaCoreProvider } from '@entities/core/context';
import { Logger } from '@features/Logger';

createRoot(document.getElementById('root') as HTMLDivElement).render(
    <StrictMode>
        <ZvonilaCoreProvider>
            <Logger />
            <AppRouter />
        </ZvonilaCoreProvider>
    </StrictMode>,
);