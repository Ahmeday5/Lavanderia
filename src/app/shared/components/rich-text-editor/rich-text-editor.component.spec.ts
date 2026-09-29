import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type Quill from 'quill';
import { RichTextEditorComponent } from './rich-text-editor.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RichTextEditorComponent],
  template: `<app-rich-text-editor [formControl]="control" />`,
})
class HostComponent {
  readonly control = new FormControl('<h1>سياسة الخصوصية</h1><p>نص أولي</p>', { nonNullable: true });
}

/** Resolves once Quill has been created inside the fixture. */
async function waitForQuill(fixture: ComponentFixture<HostComponent>): Promise<Quill> {
  for (let i = 0; i < 100; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement.querySelector('.ql-container') as HTMLElement | null;
    const quill = root && (await import('quill')).default.find(root);
    if (quill && 'getSemanticHTML' in quill) return quill as Quill;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('Quill editor was not created');
}

describe('RichTextEditorComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let quill: Quill;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    quill = await waitForQuill(fixture);
  });

  it('renders the initial HTML without dirtying the control', () => {
    expect(quill.getText()).toContain('سياسة الخصوصية');
    expect(host.control.dirty).toBeFalse();
    expect(host.control.value).toBe('<h1>سياسة الخصوصية</h1><p>نص أولي</p>');
  });

  it('does not put the loaded content in the undo history', () => {
    quill.history.undo();
    expect(quill.getText()).toContain('سياسة الخصوصية');
  });

  it('emits portable HTML: inline styles, real spaces, semantic lists', () => {
    quill.setText('', 'user');
    quill.insertText(0, 'بند أول\nفقرة في المنتصف\n', 'user');
    quill.formatLine(0, 1, 'list', 'bullet', 'user');
    quill.formatLine(8, 1, 'align', 'center', 'user');
    quill.formatText(8, 4, 'size', '18px', 'user');

    const html = host.control.value;
    expect(html).toContain('<ul><li>بند أول</li></ul>');
    expect(html).toContain('text-align: center');
    expect(html).toContain('font-size: 18px');
    expect(html).not.toContain('ql-');
    expect(html).not.toContain('&nbsp;');
    expect(host.control.dirty).toBeTrue();
  });

  it('reports an emptied editor as an empty string', () => {
    quill.setText('', 'user');
    expect(host.control.value).toBe('');
  });

  it('follows the control’s disabled state', () => {
    host.control.disable();
    fixture.detectChanges();
    expect(quill.isEnabled()).toBeFalse();
  });
});
