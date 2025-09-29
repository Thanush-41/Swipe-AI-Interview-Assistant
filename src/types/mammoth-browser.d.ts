declare module 'mammoth/mammoth.browser' {
  export interface ExtractRawTextResult {
    value: string
  }

  export function extractRawText(options: { arrayBuffer: ArrayBuffer }): Promise<ExtractRawTextResult>
}
