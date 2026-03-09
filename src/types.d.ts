declare module '@manasdb/core' {
  export class ManasDB {
    constructor(config: { databases: any[] });
    absorb(text: string): Promise<any>;
    recall(query: string): Promise<any>;
    delete(documentId: string): Promise<void>;
    init(): Promise<void>;
  }
}
