#!/usr/bin/env python3
"""Regenerates every chart in README.md from the numbers recorded in lab/results (frozen judge).
   python3 docs/figures/make_figures.py        (needs matplotlib)
Numbers are copied from lab/results/F-baseline.log, F-v1.log, F-v2.log, F-final.log, H-v1.log, H-v3.log,
lab/results/F-*/hale/report.json and docs/03, docs/04, docs/05."""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

OUT = os.path.dirname(os.path.abspath(__file__))
C = {"base": "#c0392b", "v1": "#e69f00", "fin": "#1e8449", "grey": "#7f8c8d", "blue": "#2e6da4"}
plt.rcParams.update({"font.size": 10, "axes.spines.top": False, "axes.spines.right": False, "axes.titleweight": "bold", "figure.dpi": 100})


def labels(ax, bars, fmt="{:.0f}"):
    for b in bars:
        h = b.get_height()
        ax.text(b.get_x() + b.get_width() / 2, h, fmt.format(h), ha="center", va="bottom", fontsize=9)


def save(fig, name):
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, name), dpi=160, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    print("wrote", name)


# 1. responsive, dev set (10 cases) -------------------------------------------------------------
fig, axes = plt.subplots(1, 3, figsize=(11, 3.6))
panels = [
    ("Viewports with a critical defect\n(of 170)", [163, 12, 2]),
    ("Widths with a defect in the sweep\n(of 810)", [693, 0, 2]),
    ("Touch targets under 44 px\n(summed over viewports)", [608, 96, 0]),
]
for ax, (title, vals) in zip(axes, panels):
    bars = ax.bar(["baseline", "v1", "v2 / v3"], vals, color=[C["base"], C["v1"], C["fin"]])
    labels(ax, bars)
    ax.set_title(title, fontsize=10)
    ax.set_ylim(0, max(vals) * 1.15)
fig.suptitle("universal-responsive-design: development set (10 cases x 17 viewports + 81-width sweep)", y=1.04, fontsize=11)
fig.text(0.5, -0.04, "The 2 left at v2/v3 are one adjudicated judge false positive (two wrapped inline links); the skill's own audit reports 0.", ha="center", fontsize=8, color=C["grey"])
save(fig, "fig-responsive-dev.png")

# 2. responsive per case ------------------------------------------------------------------------
cases = ["r01\nhero", "r02\nnav", "r03\ngrids", "r04\ndash", "r05\ntables", "r06\nforms", "r07\nmedia", "r08\ncomplex", "r09\ntype", "r10\nfooter"]
base = [17, 17, 17, 17, 17, 17, 17, 17, 15, 12]
v1 = [0, 0, 0, 0, 0, 12, 0, 0, 0, 0]
fin = [0, 0, 0, 0, 0, 2, 0, 0, 0, 0]
fig, ax = plt.subplots(figsize=(11, 3.8))
x = range(len(cases))
w = 0.27
ax.bar([i - w for i in x], base, w, label="baseline (desktop-first, planted defects)", color=C["base"])
ax.bar(list(x), v1, w, label="v1 skill", color=C["v1"])
ax.bar([i + w for i in x], fin, w, label="v2 / v3 skill", color=C["fin"])
ax.set_xticks(list(x)); ax.set_xticklabels(cases)
ax.set_ylabel("viewports with a critical defect (of 17)")
ax.set_title("Per case: critical viewports before and after")
ax.legend(frameon=False, fontsize=9, loc="upper right")
ax.annotate("v1 split links into 20 px\nflex items (tap targets)", xy=(5, 12), xytext=(5.9, 14.2), fontsize=8, arrowprops=dict(arrowstyle="->", color=C["grey"]))
save(fig, "fig-responsive-percase.png")

# 3. held-out ------------------------------------------------------------------------------------
fig, axes = plt.subplots(1, 2, figsize=(11, 3.6))
names = ["r11 pricing", "r12 article", "r13 listing"]
data = {"baseline": [11, 17, 17], "v1-style first pass": [5, 0, 17], "frozen v3 workflow": [0, 0, 0]}
cols = [C["base"], C["v1"], C["fin"]]
for k, (lab, vals) in enumerate(data.items()):
    bars = axes[0].bar([i + (k - 1) * 0.27 for i in range(3)], vals, 0.27, label=lab, color=cols[k])
    labels(axes[0], bars)
axes[0].set_xticks(range(3)); axes[0].set_xticklabels(names)
axes[0].set_title("Critical viewports (of 17)"); axes[0].legend(frameon=False, fontsize=8)
tap = {"baseline": [44, 64, 336], "v1-style first pass": [72, 72, 228], "frozen v3 workflow": [12, 0, 0]}
for k, (lab, vals) in enumerate(tap.items()):
    bars = axes[1].bar([i + (k - 1) * 0.27 for i in range(3)], vals, 0.27, color=cols[k])
    labels(axes[1], bars)
axes[1].set_xticks(range(3)); axes[1].set_xticklabels(names)
axes[1].set_title("Touch targets under 44 px (summed)")
fig.suptitle("Held-out pages: never used while improving the skill (frozen before they were opened)", y=1.04, fontsize=11)
save(fig, "fig-responsive-heldout.png")

# 4. real-world site, per category across versions ----------------------------------------------
vers = ["original", "v1", "v2", "v3", "final"]
fig, axes = plt.subplots(1, 3, figsize=(11, 3.6))
axes[0].plot(vers, [4, 4, 0, 0, 0], "o-", color=C["base"], label="content cut by overflow-x:hidden")
axes[0].plot(vers, [4, 4, 0, 0, 0], "s--", color=C["blue"], label="content offscreen", alpha=0.6)
axes[0].set_title("Viewports (of 17) with hidden / offscreen content", fontsize=9)
axes[0].legend(frameon=False, fontsize=7)
axes[1].plot(vers, [158, 68, 76, 8, 8], "o-", color=C["v1"])
for i, v in enumerate([158, 68, 76, 8, 8]):
    axes[1].text(i, v + 4, str(v), ha="center", fontsize=8)
axes[1].set_title("Touch targets under 44 px (summed)", fontsize=9)
b = axes[2].bar(["before fix", "after fix"], [10, 0], color=[C["base"], C["fin"]])
labels(axes[2], b)
axes[2].set_title("Footer rail: widths (of 26) where garments are\ncut off by the viewport (found only by the sweep)", fontsize=9)
axes[2].set_ylim(0, 12)
fig.suptitle("Real-world test site (Next.js shop, scroll-driven): version by version", y=1.05, fontsize=11)
save(fig, "fig-realworld.png")

# 5. localization --------------------------------------------------------------------------------
fig, axes = plt.subplots(1, 2, figsize=(11, 3.8))
cats = ["critical", "major", "minor"]
# findings on the v1 output: by judge script / by review pass
judge = [1, 0, 0]  # l03 French text clipped (4 widths, 1 case/language pair)
review = [1, 3, 2]  # critical: heading meaning change | major: "Service", "drop" CTA, no hreflang (12 pages) | minor: French spacing, tipping custom
x = range(3)
b1 = axes[0].bar([i - 0.2 for i in x], judge, 0.4, label="found by the judge script", color=C["blue"])
b2 = axes[0].bar([i + 0.2 for i in x], review, 0.4, label="found only by the review pass (reading pairs.tsv)", color=C["v1"])
labels(axes[0], b1); labels(axes[0], b2)
axes[0].set_xticks(list(x)); axes[0].set_xticklabels(cats)
axes[0].set_title("What was wrong in the v1 localization output\n(dev set, 14 case/language pairs; severities as in docs/04)", fontsize=10)
axes[0].legend(frameon=False, fontsize=8)
axes[0].set_ylabel("distinct findings")
vals = {"first pass\n(v1 process)": [1, 0], "after frozen\nv2.1 workflow": [0, 0]}
bb = axes[1].bar(list(vals.keys()), [v[0] for v in vals.values()], color=[C["v1"], C["fin"]])
labels(axes[1], bb)
axes[1].set_title("Held-out (docs, restaurant fr + ar):\nreal critical issues", fontsize=10)
axes[1].set_ylim(0, 2)
fig.suptitle("smart-website-localization", y=1.03, fontsize=11)
save(fig, "fig-localization.png")

# 6. skill evolution: capability of the audit / verifier by version ------------------------------
fig, axes = plt.subplots(1, 2, figsize=(11, 3.3))
resp_caps = [("overflow", 1, 1, 1), ("offscreen elements", 1, 1, 1), ("touch targets (counts)", 1, 0, 0), ("touch targets (listed, 24/44 px)", 0, 1, 1), ("tiny text", 1, 1, 1),
             ("width sweep 320-1600", 0, 1, 1), ("clipped text", 0, 1, 1), ("overlaps", 0, 1, 1), ("distorted images", 0, 1, 1), ("hidden overflow", 0, 1, 1),
             ("unreachable content", 0, 1, 1), ("--compare regression gate", 0, 1, 1), ("intentional stages / scrollers", 0, 0, 1), ("per-line overlap, scroller-aware", 0, 0, 1)]
loc_caps = [("lang / dir", 1, 1), ("leftover source language", 1, 1), ("structure parity", 1, 1), ("lazy images flagged broken (false +)", 1, 0), ("pairs.tsv review file", 0, 1),
            ("new clipped text vs source", 0, 1), ("glossary + protected terms", 0, 1), ("hreflang / metadata / a11y", 0, 1), ("interpolation tokens", 0, 1), ("code blocks intact", 0, 1),
            ("French typography", 0, 1), ("RTL mirror test", 0, 1), ("interaction steps + source scan", 0, 1)]
ax = axes[0]
ax.bar(["v1", "v2", "v3"], [sum(c[1] for c in resp_caps), sum(c[2] for c in resp_caps), sum(c[3] for c in resp_caps)], color=[C["v1"], C["blue"], C["fin"]])
for i, v in enumerate([sum(c[1] for c in resp_caps), sum(c[2] for c in resp_caps), sum(c[3] for c in resp_caps)]):
    ax.text(i, v + 0.2, str(v), ha="center", fontsize=9)
ax.set_title(f"Responsive audit: checks it performs\n(of {len(resp_caps)} capabilities)", fontsize=10)
ax = axes[1]
ax.bar(["v1", "v2"], [sum(c[1] for c in loc_caps if "false" not in c[0]), sum(c[2] for c in loc_caps)], color=[C["v1"], C["fin"]])
for i, v in enumerate([sum(c[1] for c in loc_caps if "false" not in c[0]), sum(c[2] for c in loc_caps)]):
    ax.text(i, v + 0.2, str(v), ha="center", fontsize=9)
ax.set_title(f"Localization verifier: checks it performs\n(of {len(loc_caps) - 1} capabilities)", fontsize=10)
fig.suptitle("Tool capability grew only where a measured failure justified it", y=1.04, fontsize=11)
fig.text(0.5, -0.05, "Counted from the capability lists in docs/03 and docs/04 (a rough measure of scope, not of quality).", ha="center", fontsize=8, color=C["grey"])
save(fig, "fig-evolution.png")
