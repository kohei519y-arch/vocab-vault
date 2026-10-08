import subprocess, os

scripts = [
    'js/storage.js',
    'js/anki.js',
    'js/sync.js',
    'js/ocr.js',
    'js/graph.js',
    'js/feedback.js',
    'js/starter_pack.js',
    'js/app.js'
]

test_js = """
var window = globalThis;
var global = globalThis;
globalThis.location = { pathname: '/', search: '?master=1' };
globalThis.URLSearchParams = function(s) {
    return { get: function(k) { return k === 'master' ? '1' : null; } };
};
globalThis.localStorage = {
    _data: {},
    getItem: function(k) { return this._data[k] || null; },
    setItem: function(k, v) { this._data[k] = String(v); },
    removeItem: function(k) { delete this._data[k]; }
};
globalThis.addEventListener = function(event, cb) { if (event === 'DOMContentLoaded') globalThis._domReady = cb; };
globalThis.document = {
    addEventListener: function(event, cb) { if (event === 'DOMContentLoaded') globalThis._domReady = cb; },
    body: { classList: { add: function(){}, remove: function(){}, contains: function(){ return false; }, toggle: function(){} } },
    getElementById: function() { return { value: '', classList: { add: function(){}, remove: function(){}, toggle: function(){} }, style: {}, innerHTML: '', addEventListener: function(){}, querySelectorAll: function(){ return []; }, querySelector: function(){ return null; }, appendChild: function(){} }; },
    querySelector: function() { return { value: '', classList: { add: function(){}, remove: function(){}, toggle: function(){} }, style: {}, innerHTML: '', addEventListener: function(){}, querySelectorAll: function(){ return []; }, querySelector: function(){ return null; }, appendChild: function(){} }; },
    querySelectorAll: function() { return []; },
    createElement: function() { return { style: {}, appendChild: function(){}, addEventListener: function(){} }; }
};
globalThis.navigator = { userAgent: 'iPhone', onLine: true };
globalThis.innerWidth = 390;
globalThis.innerHeight = 844;
"""

for s in scripts:
    with open(s) as f:
        test_js += f"\n// --- {s} ---\n" + f.read()

test_js += """
print("SCRIPTS EVALUATED OK");
if (globalThis._domReady) {
    try {
        globalThis._domReady();
        print("DOM_READY CALLED OK");
    } catch(e) {
        print("DOM_READY ERROR: " + e + "\\n" + e.stack);
    }
}
"""

with open('/tmp/test_load.js', 'w') as f:
    f.write(test_js)

res = subprocess.run(['/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc', '/tmp/test_load.js'], capture_output=True, text=True)
print('STDOUT:', res.stdout)
print('STDERR:', res.stderr)
print('CODE:', res.returncode)
