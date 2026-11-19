// Transforma o Markdown de uma página em HTML seguro para mostrar na tela.
// O DOMPurify remove scripts e atributos perigosos, porque o HTML é inserido com v-html.
import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: false });

export function renderizarMarkdown(md: string): string {
  const html = marked.parse(md, { async: false });
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_DATA_URI_TAGS: ['img'] });
}
