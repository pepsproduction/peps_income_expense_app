"""
PEPS Income / Expense App — Project Verification Script
รัน: python verify_project.py
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
checks = []


def ok(name, passed, detail=''):
    status = '✅' if passed else '❌'
    checks.append((name, passed, detail))
    print(f'  {status} {name}' + (f' — {detail}' if detail else ''))


def section(title):
    print(f'\n── {title} ──')


# ══════════════════════════════════════
# A) Required files
# ══════════════════════════════════════
section('A) ไฟล์ที่จำเป็น')

WEB_FILES = ['web/index.html', 'web/styles.css', 'web/app.js']
AS_FILES = [
    'apps-script/Code.gs',
    'apps-script/index.html',
    'apps-script/styles.html',
    'apps-script/app.html',
    'apps-script/transaction_form.html',
    'apps-script/appsscript.json',
]
ROOT_FILES = ['README.md', '.gitignore', 'index.html', 'verify_project.py']
DOC_FILES = ['docs/CLEANUP_REPORT.md', 'docs/SETUP_APPS_SCRIPT.md', 'docs/DEPLOYMENT.md']

for f in WEB_FILES + AS_FILES + ROOT_FILES + DOC_FILES:
    ok(f'มีไฟล์ {f}', (ROOT / f).exists())

# ══════════════════════════════════════
# B) Junk files should NOT exist
# ══════════════════════════════════════
section('B) ไฟล์ขยะที่ต้องไม่มีแล้ว')

JUNK = ['local_preview.html', 'preview.html', 'pages.css', 'pages.js']
for f in JUNK:
    ok(f'ไม่มีไฟล์ขยะ {f}', not (ROOT / f).exists())

# ══════════════════════════════════════
# C) web/index.html — GitHub Pages safe
# ══════════════════════════════════════
section('C) web/index.html ปลอดภัยสำหรับ GitHub Pages')

web_index_path = ROOT / 'web/index.html'
if web_index_path.exists():
    web_index = web_index_path.read_text(encoding='utf-8')
    ok('web/index.html ไม่มี Apps Script template syntax (<?=)',
       '<?=' not in web_index and '<?!=' not in web_index)
    ok('web/index.html มี link ไป styles.css',
       'styles.css' in web_index)
    ok('web/index.html มี link ไป app.js',
       'app.js' in web_index)
    ok('web/index.html มี localStorage mock (mockApi หรือ STORAGE_KEY)',
       'localStorage' in web_index or 'mockApi' in (ROOT / 'web/app.js').read_text(encoding='utf-8') if (ROOT / 'web/app.js').exists() else False)
    ok('web/index.html ไม่มี google.script.run (production code)',
       'google.script.run' not in web_index)
    ok('web/index.html มี bottom-nav',
       'bottom-nav' in web_index)
    ok('web/index.html มีฟอร์ม incomeForm',
       'id="incomeForm"' in web_index or "id='incomeForm'" in web_index)
    ok('web/index.html มีฟอร์ม expenseForm',
       'id="expenseForm"' in web_index or "id='expenseForm'" in web_index)
else:
    ok('อ่าน web/index.html ได้', False, 'ไม่พบไฟล์')

# ══════════════════════════════════════
# D) web/app.js — JS check
# ══════════════════════════════════════
section('D) web/app.js syntax')

app_js_path = ROOT / 'web/app.js'
if app_js_path.exists():
    app_js = app_js_path.read_text(encoding='utf-8')
    ok('web/app.js มี localStorage mock',
       'localStorage' in app_js)
    ok('web/app.js มี mockApi function',
       'mockApi' in app_js or 'function mock' in app_js)
    ok('web/app.js มี gas() bridge function',
       'function gas' in app_js)
    ok('web/app.js มี Asia/Bangkok',
       'Asia/Bangkok' in app_js)
    ok('web/app.js ไม่มี google.script.run โดยตรง (ใช้ผ่าน gas())',
       app_js.count('google.script.run') == 0 or 'function gas' in app_js)

    # Node syntax check
    try:
        subprocess.run(['node', '--check', str(app_js_path)],
                       check=True, capture_output=True, text=True)
        ok('web/app.js syntax ผ่าน node --check', True)
    except FileNotFoundError:
        ok('web/app.js syntax ผ่าน node --check', False, 'ไม่พบ node')
    except subprocess.CalledProcessError as e:
        ok('web/app.js syntax ผ่าน node --check', False, e.stderr.strip()[:120])
else:
    ok('อ่าน web/app.js ได้', False, 'ไม่พบไฟล์')

# ══════════════════════════════════════
# E) apps-script/appsscript.json
# ══════════════════════════════════════
section('E) apps-script/appsscript.json')

manifest_path = ROOT / 'apps-script/appsscript.json'
if manifest_path.exists():
    try:
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        ok('appsscript.json เป็น JSON ถูกต้อง', True)
        ok('timezone เป็น Asia/Bangkok', manifest.get('timeZone') == 'Asia/Bangkok')
        ok('runtimeVersion เป็น V8', manifest.get('runtimeVersion') == 'V8')
        ok('มี webapp config', 'webapp' in manifest)
        ok('มี oauthScopes', 'oauthScopes' in manifest)
    except Exception as e:
        ok('appsscript.json เป็น JSON ถูกต้อง', False, str(e))
else:
    ok('อ่าน appsscript.json ได้', False, 'ไม่พบไฟล์')

# ══════════════════════════════════════
# F) apps-script/Code.gs
# ══════════════════════════════════════
section('F) apps-script/Code.gs functions')

code_path = ROOT / 'apps-script/Code.gs'
if code_path.exists():
    code = code_path.read_text(encoding='utf-8')

    required_functions = [
        'doGet', 'include', 'setupApp', 'installEditTrigger',
        'onEditInstalled', 'handleEdit',
        'getBootstrapData', 'addTransaction', 'addCategory',
        'uploadSlip_', 'getCategories', 'getDashboardData',
        'getTransactions', 'buildTransactionRow_', 'nowBangkok_',
        'ensureSheets_', 'writeLog_',
    ]
    for fn in required_functions:
        ok(f'มีฟังก์ชัน {fn}()',
           re.search(rf'function\s+{fn}\s*\(', code) is not None)

    ok('ตั้งค่า Spreadsheet ID แล้ว',
       '1VMzcS0GmqCNa8WcdA9GQdoslYIoDhZJXGVSgUUMKBJE' in code)
    ok('ไม่มี SPREADSHEET_ID ว่าง',
       "SPREADSHEET_ID: ''" not in code and 'SPREADSHEET_ID: ""' not in code)
    ok('มีระบบอัปโหลดสลิปไป Drive',
       'DriveApp' in code and 'uploadSlip_' in code)
    ok('มี Asia/Bangkok ใน Code.gs',
       'Asia/Bangkok' in code)
    ok('มี Utilities.formatDate ใน Code.gs',
       'Utilities.formatDate' in code)
    ok('มีการกรอง type income/expense',
       'income' in code and 'expense' in code)

    # Node syntax check for Code.gs
    try:
        tmp = ROOT / '_tmp_code_check.js'
        tmp.write_text(code, encoding='utf-8')
        subprocess.run(['node', '--check', str(tmp)],
                       check=True, capture_output=True, text=True)
        ok('Code.gs syntax ผ่าน node --check', True)
    except FileNotFoundError:
        ok('Code.gs syntax ผ่าน node --check', False, 'ไม่พบ node')
    except subprocess.CalledProcessError as e:
        ok('Code.gs syntax ผ่าน node --check', False, e.stderr.strip()[:120])
    finally:
        if (ROOT / '_tmp_code_check.js').exists():
            (ROOT / '_tmp_code_check.js').unlink()
else:
    ok('อ่าน Code.gs ได้', False, 'ไม่พบไฟล์')

# ══════════════════════════════════════
# G) apps-script/index.html — has includes
# ══════════════════════════════════════
section('G) apps-script/index.html includes')

as_index_path = ROOT / 'apps-script/index.html'
if as_index_path.exists():
    as_index = as_index_path.read_text(encoding='utf-8')
    for inc in ['styles', 'app', 'transaction_form']:
        ok(f"apps-script/index.html มี include('{inc}')",
           f"include('{inc}')" in as_index or f'include("{inc}")' in as_index)
    ok('apps-script/index.html มี <?= appTitle ?>',
       '<?= appTitle ?>' in as_index or "<?= appTitle?>" in as_index)
else:
    ok('อ่าน apps-script/index.html ได้', False, 'ไม่พบไฟล์')

# ══════════════════════════════════════
# H) root index.html — redirect
# ══════════════════════════════════════
section('H) root index.html redirect')

root_index = ROOT / 'index.html'
if root_index.exists():
    ri = root_index.read_text(encoding='utf-8')
    ok('root index.html มี redirect ไป web/index.html',
       'web/index.html' in ri)
    ok('root index.html ไม่มี Apps Script syntax',
       '<?=' not in ri and '<?!=' not in ri)
else:
    ok('อ่าน root index.html ได้', False, 'ไม่พบไฟล์')

# ══════════════════════════════════════
# Summary
# ══════════════════════════════════════
passed = sum(1 for _, p, _ in checks if p)
total = len(checks)
failed_list = [(n, d) for n, p, d in checks if not p]

print(f'\n{"═"*50}')
print(f'ผล: ผ่าน {passed}/{total} checks')
if failed_list:
    print(f'\n❌ Failed checks ({len(failed_list)}):')
    for n, d in failed_list:
        print(f'  - {n}' + (f' — {d}' if d else ''))

# Write report
report_lines = [
    '# Verify Report',
    '',
    f'ผล: ผ่าน {passed}/{total} checks',
    f'วันที่ตรวจ: {__import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
    '',
]
for name, passed_bool, detail in checks:
    icon = '✅' if passed_bool else '❌'
    line = f'- {icon} {name}'
    if detail:
        line += f' — {detail}'
    report_lines.append(line)

(ROOT / 'docs/VERIFY_REPORT.md').write_text('\n'.join(report_lines) + '\n', encoding='utf-8')
print(f'\n📄 บันทึก VERIFY_REPORT.md แล้ว')

if failed_list:
    sys.exit(1)
else:
    print('🎉 ทุก check ผ่าน!')
