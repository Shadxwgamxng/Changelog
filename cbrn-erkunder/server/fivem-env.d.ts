// Globale Funktionen der FiveM-Server-Laufzeit (nur die hier verwendeten)
declare function onNet(name: string, cb: (...args: any[]) => void): void;
declare function emitNet(name: string, target: number | string, ...args: any[]): void;
declare function on(name: string, cb: (...args: any[]) => void): void;
declare function GetPlayerName(src: number | string): string | null;
declare function GetCurrentResourceName(): string;
declare function GetResourcePath(name: string): string;
declare const source: number;
