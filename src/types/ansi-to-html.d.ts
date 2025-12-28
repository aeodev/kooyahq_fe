declare module 'ansi-to-html' {
  type AnsiToHtmlOptions = {
    fg?: string
    bg?: string
    newline?: boolean
    escapeXML?: boolean
    stream?: boolean
    colors?: string[] | Record<number | string, string>
  }

  export default class AnsiToHtml {
    constructor(options?: AnsiToHtmlOptions)
    toHtml(input: string): string
  }
}
