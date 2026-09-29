import { countWords, htmlToPlainText, isHtmlBlank, normalizeEditorHtml } from './html-content.util';

describe('html-content.util', () => {
  describe('normalizeEditorHtml', () => {
    it('turns single encoded spaces back into wrappable spaces', () => {
      expect(normalizeEditorHtml('<p>سياسة&nbsp;الخصوصية&nbsp;للتطبيق</p>')).toBe(
        '<p>سياسة الخصوصية للتطبيق</p>',
      );
    });

    it('keeps intentional runs of spaces visible', () => {
      expect(normalizeEditorHtml('<p>a&nbsp;&nbsp;&nbsp;b</p>')).toBe('<p>a &nbsp;&nbsp;b</p>');
    });

    it('treats an empty editor as no content', () => {
      expect(normalizeEditorHtml('<p><br></p>')).toBe('');
      expect(normalizeEditorHtml('<p></p><p><br/></p>')).toBe('');
      expect(normalizeEditorHtml(null)).toBe('');
    });

    it('leaves markup and attributes untouched', () => {
      const html = '<h1 style="text-align: center;">عنوان</h1><ul><li>بند</li></ul>';
      expect(normalizeEditorHtml(html)).toBe(html);
    });
  });

  describe('isHtmlBlank / htmlToPlainText', () => {
    it('ignores tags and whitespace-only text', () => {
      expect(isHtmlBlank('<p>&nbsp;</p><h2> </h2>')).toBeTrue();
      expect(isHtmlBlank('<p>نص</p>')).toBeFalse();
    });

    it('decodes entities', () => {
      expect(htmlToPlainText('<p>A &amp; B</p>')).toBe('A & B');
    });
  });

  it('counts words across Arabic and Latin text', () => {
    expect(countWords('  سياسة الخصوصية  for app ')).toBe(4);
    expect(countWords('   ')).toBe(0);
  });
});
