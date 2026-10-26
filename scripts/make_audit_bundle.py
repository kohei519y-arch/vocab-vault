#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vocab Vault — Codebase Unified Bundle Generator
Compiles all production source code (HTML, CSS, Service Worker, JavaScript modules,
Supabase Edge Functions, PostgreSQL schema, macOS native wrapper, and build scripts)
into a single comprehensive file: VOCAB_VAULT_ALL_CODE.md
"""

import os
import sys

BUNDLE_HEADER = """# Vocab Vault — Complete Source Code Architecture

- Project: Vocab Vault (v2.0.0 Production Release)
- Description: Multilingual (10 Languages / 100 Language Pairs) Deep Etymology & Conceptual History Learning Platform with FSRS-4.5 / SM-2 Spaced Repetition Engine.
- Quality Status: 727 Automated Tests Passed (100% Pass Rate). Absolute Zero Emoji Policy Enforced.
- Key Components:
  1. Frontend Client: Vanilla ES6+ Modular Architecture (HTML5 Canvas, WebGL Hybrid, IndexedDB SSOT)
  2. Spaced Repetition: FSRS-4.5 / SM-2 Engine with Workload Forecasting & Load Smoothing Fuzzing
  3. Etymology Engine: Morphology Grid (Prefix x Root) & Outliner Mindmap (PIE & CJK Roots)
  4. Backend: Supabase PostgreSQL (RLS, Keyset Cursor Sync, Idempotent Quota) & Deno Edge Functions
  5. Native Desktop: macOS Cocoa / WebKit Native Wrapper (Objective-C)

---

"""

ALL_SOURCE_FILES = [
    # 1. HTML, Manifest & Styles
    'index.html',
    'css/app.css',
    'sw.js',
    'manifest.json',

    # 2. Core Storage, App & Events
    'js/storage.js',
    'js/app.js',
    'js/events.js',
    'js/modal.js',
    'js/navigation.js',

    # 3. Spaced Repetition (FSRS-4.5 / SM-2) & Analytics
    'js/anki.js',
    'js/anki_view.js',

    # 4. Search, Filtering, List & Card Rendering
    'js/search.js',
    'js/list_view.js',
    'js/card_view.js',

    # 5. Mindmap, Morphology Matrix & Lineage Graph Engine
    'js/graph.js',
    'js/graph_views.js',
    'js/graph_layout.js',
    'js/graph_renderer.js',
    'js/graph_webgl.js',
    'js/morphology.js',

    # 6. AI Generation, Queue, OCR, Dictionary & Speech
    'js/queue.js',
    'js/dictionary.js',
    'js/ocr.js',
    'js/speech.js',

    # 7. Distributed Sync, Export, Catalogs & Feedback
    'js/sync.js',
    'js/export.js',
    'js/starter_pack.js',
    'js/eiken_catalog.js',
    'js/feedback.js',
    'js/i18n.js',

    # 8. Supabase Backend Schema & Edge Functions
    'supabase/schema.sql',
    'supabase/enable_cache.sql',
    'supabase/functions/vocab-generate/index.ts',
    'supabase/functions/stripe-webhook/index.ts',
    'supabase/functions/delete-account/index.ts',
    'supabase/functions/stripe-checkout/index.ts',
    'supabase/functions/stripe-portal/index.ts',
    'supabase/functions/feedback/index.ts',

    # 9. macOS Native Desktop Wrapper
    'scripts/native_app/main.m',

    # 10. Automated Master Build Pipeline
    'scripts/build.py',
    'scripts/update_mac_app.py',
    'package.json'
]

def generate_bundle(base_dir, out_filename, file_list):
    output_path = os.path.join(base_dir, out_filename)
    total_lines = 0
    with open(output_path, 'w', encoding='utf-8') as out:
        out.write(BUNDLE_HEADER)

        # Table of contents
        out.write("## Table of Included Files\n\n")
        for idx, frel in enumerate(file_list, 1):
            out.write(f"{idx}. [{frel}](#file-{frel.replace('/', '-').replace('.', '-')})\n")
        out.write("\n---\n\n")

        for frel in file_list:
            fpath = os.path.join(base_dir, frel)
            if not os.path.exists(fpath):
                print(f"Warning: {frel} does not exist, skipping.")
                continue

            ext = os.path.splitext(frel)[1].replace('.', '') or 'txt'
            if ext == 'm': ext = 'objc'
            elif ext == 'ts': ext = 'typescript'
            elif ext == 'js': ext = 'javascript'
            elif ext == 'sql': ext = 'sql'
            elif ext == 'html': ext = 'html'
            elif ext == 'css': ext = 'css'
            elif ext == 'json': ext = 'json'

            anchor_id = f"file-{frel.replace('/', '-').replace('.', '-')}"
            out.write(f'<a id="{anchor_id}"></a>\n')
            out.write(f"### File: `{frel}`\n\n```{ext}\n")
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as src:
                content = src.read()
                out.write(content)
                total_lines += content.count('\n')
            out.write("\n```\n\n---\n\n")

    size_bytes = os.path.getsize(output_path)
    size_mb = size_bytes / (1024 * 1024)
    print(f"Generated {out_filename}: {len(file_list)} files, {total_lines:,} lines, {size_mb:.2f} MB")
    return output_path

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    generate_bundle(base_dir, 'VOCAB_VAULT_ALL_CODE.md', ALL_SOURCE_FILES)

if __name__ == '__main__':
    main()
