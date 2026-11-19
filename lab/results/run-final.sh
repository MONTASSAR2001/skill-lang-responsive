#!/bin/bash
cd /home/montassar/Desktop/projects/skill-lang-responsive
export PLAYWRIGHT_MODULE=/home/montassar/.claude/plugins/cache/pixel-clone/pixel-clone/0.1.0/node_modules/playwright
node lab/harness/check-l10n.mjs --id hale --lang fr --out lab/results/F-final/hale-fr > lab/results/F-final-hale-l10n.log 2>&1
node skills/smart-website-localization/scripts/verify.mjs --source http://localhost:3217/ --target http://localhost:3217/fr --lang fr --glossary lab/results/combined/glossary-hale.json --out lab/results/combined/l10n-verify-final --steps "click:.rk-buy button;wait:2400" --intentional ".st-stage,.rk-stage,.zm-stage,.to-stage,.tl-stage,.fd,#lookbook,.fr" > lab/results/combined/l10n-verify-final.log 2>&1
node skills/universal-responsive-design/scripts/audit.mjs --url http://localhost:3217/fr --out lab/results/combined/fr/final --intentional ".rk-world,.st-track,.fr-rail,.st-stage,.rk-stage,.zm-stage,.to-stage,.tl-stage,.lb-word,.fd-mark,.bag,.lb-figure" --wait 1500 --scroll-shots 6 --compare lab/results/combined/fr/before/audit.json > lab/results/combined/fr-audit-final.log 2>&1
node skills/universal-responsive-design/scripts/audit.mjs --url http://localhost:3217/ --out lab/results/combined/en/final --intentional ".rk-world,.st-track,.fr-rail,.st-stage,.rk-stage,.zm-stage,.to-stage,.tl-stage,.lb-word,.fd-mark,.bag,.lb-figure" --wait 1500 --compare lab/results/v2-run/hale/before/audit.json > lab/results/combined/en-audit-final.log 2>&1
node lab/harness/check-responsive.mjs --url http://localhost:3217/ --id hale --out lab/results/F-final/hale > lab/results/F-final-hale.log 2>&1
echo done > lab/results/run-final.done
