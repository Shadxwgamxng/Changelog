// Ressourcenordner: im FiveM-Betrieb der Ordner der Ressource, sonst das Arbeitsverzeichnis (Entwicklung).
declare const GetResourcePath: ((name: string) => string) | undefined;
declare const GetCurrentResourceName: (() => string) | undefined;
export const RES_DIR: string = typeof GetResourcePath === 'function' && typeof GetCurrentResourceName === 'function' ? GetResourcePath(GetCurrentResourceName()) : process.cwd();
export const IN_FIVEM = typeof GetResourcePath === 'function';
