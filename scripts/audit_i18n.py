import os
import re

kana_re = re.compile(r'[\u3040-\u309f\u30a0-\u30ff]')

def audit_js_files():
    print("=== AUDIT 1: JS Files with Hardcoded Japanese in UI operations ===")
    js_dir = 'js'
    for f in sorted(os.listdir(js_dir)):
        if not f.endswith('.js'):
            continue
        p = os.path.join(js_dir, f)
        with open(p, 'r', encoding='utf-8') as fp:
            content = fp.read()
        lines = content.split('\n')
        
        # Look for showToast, confirm, alert, prompt, textContent, innerHTML with kana
        findings = []
        for i, line in enumerate(lines, 1):
            if f == 'i18n.js':
                # Skip translations dict in i18n.js, but check outside dict
                if i < 1920:
                    continue
            if 'kana_re' in line or 'hasKana' in line or 'test(' in line or '//' in line.strip()[:2]:
                continue
            
            # Check showToast
            if 'showToast(' in line and kana_re.search(line):
                findings.append((i, 'showToast', line.strip()))
            elif 'confirm(' in line and kana_re.search(line):
                findings.append((i, 'confirm', line.strip()))
            elif 'alert(' in line and kana_re.search(line):
                findings.append((i, 'alert', line.strip()))
            elif 'prompt(' in line and kana_re.search(line):
                findings.append((i, 'prompt', line.strip()))
            elif ('.textContent =' in line or '.innerHTML =' in line) and kana_re.search(line):
                # ignore comments or regex
                if not line.strip().startswith('//') and not line.strip().startswith('/*'):
                    findings.append((i, 'DOM text/HTML', line.strip()))

        if findings:
            print(f"\n--- {f} ({len(findings)} items) ---")
            for line_no, kind, text in findings[:15]:
                print(f"  L{line_no} [{kind}]: {text[:100]}")
            if len(findings) > 15:
                print(f"  ... and {len(findings) - 15} more")

def audit_html_elements():
    print("\n=== AUDIT 2: HTML tags without data-i18n containing Japanese ===")
    with open('index.html', 'r', encoding='utf-8') as fp:
        lines = fp.readlines()
    
    # Check elements with text between tags >...< containing kana but without data-i18n
    untranslated_tags = []
    tag_re = re.compile(r'>([^<]+)<')
    for i, line in enumerate(lines, 1):
        # Ignore comments or script tags
        if '<!--' in line or '<script' in line or '</script>' in line or '<style' in line or '<svg' in line or '<path' in line:
            continue
        matches = tag_re.findall(line)
        for m in matches:
            text = m.strip()
            if text and kana_re.search(text):
                if 'data-i18n' not in line:
                    untranslated_tags.append((i, text, line.strip()))
    
    print(f"Total untranslated HTML tags in index.html: {len(untranslated_tags)}")
    for i, t, l in untranslated_tags[:20]:
        print(f"  L{i}: {t[:60]} (in line: {l[:80]})")
    if len(untranslated_tags) > 20:
        print(f"  ... and {len(untranslated_tags) - 20} more")

if __name__ == '__main__':
    audit_js_files()
    audit_html_elements()
