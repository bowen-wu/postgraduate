---
name: extract-exercises
description: 从教材影印照片（如张宇《高等数学18讲》）提取题目并生成 LaTeX 题目集 PDF。当用户提供书籍照片/截图并要求提取题目、做题集、方便去书上找答案时使用。涵盖并行解析、题目范围判定、选项排版规则、页面填满调优与编译验证。
---

# 教材题目照片 → LaTeX 题目集 PDF

完整流程：**并行解析照片 → 组装 main.tex → 编译 → 逐页渲染检查 → 间距调优**。
产物放在 `recite` 同级（如 `math/advanced-mathematics/exercises/`），`main.tex` + `pdf/main.pdf`。

## 阶段一：并行解析照片

1. 把用户的图片按文件名时间戳顺序复制重命名到 `/tmp/ex/pNN.jpg`（用户手机传图常带中文名）。
2. **开多个 subagent 并行解析**（用户明确支持）：每个 agent 负责 ~5 张图，写 `/tmp/ex/fragN.tex`。
   - 照片多为横置 90° 侧拍：先用 PIL `rotate(±90, expand=True)` 转正再 Read。
   - 每张图前加 `% ---- pNN ----` 注释，写明该页内容（题目/解答/理论），便于组装和复查。
3. **只录题目，不录其他**（用户核心要求）：
   - 【解】【分析】【证】【注】、答案、蓝色手写批注、思维导图、方法总结、页缘残句（前后页裁切/重叠出来的）一律截断不录。
   - 前后照片有重叠时，同一题只录一次。
4. **题目范围判定（最容易出错，2026-11 例2.11 教训）**：
   - 先找「例x.x」标签，**标签之后跟着的才是题目本体**；紧挨标签的定理陈述、定义、方法条目属于理论，不能当题干。
   - 自查每条题干必须有设问结构（求…/证明…/则（　）/填空线）。若"题干"是完整陈述且无设问，它是理论，真正题目在其后。
5. **存疑处放大原图核对**：上标/下标/分数看不清时，用 PIL crop 局部 + 全分辨率保存再 Read。
   可用书的【解】反推校验（如例2.9 的上标 a 由解答 a=3 反推；例2.10 的极限式放大后才发现是 b_n^{ln cos b_n/n} 而非 (cos b_n)^{1/n}）。
6. 不要给题目加【图】之类的配图标记（用户已明确去掉）。

## 阶段二：组装 main.tex

把 frag1..fragN 按书页顺序（≠ 图片顺序，照片可能乱序）拼进骨架。骨架（`exercises/` 目录深度为 3 层，template 路径相应调整）：

```latex
\documentclass[a4paper,11pt]{article}
\usepackage{../../../utils/template}
\newgeometry{ left=1.0cm, right=1.0cm, top=0.8cm, bottom=0.8cm }
\pagestyle{empty}

% 例题：\examp{例x.x}{题干}
\newcommand{\examp}[2]{\vspace{0.65em}\noindent\textbf{#1}\quad #2\par\vspace{0.3em}}
% 习题列表（无编号配套题用）
\newenvironment{probs}
    {\begin{enumerate}[leftmargin=2.2em, itemsep=0.55em]}
    {\end{enumerate}}

% ===== 选项排版（均靠左，固定列宽 tabular）=====
% opts1：每个选项独占一行（长选项）
\newenvironment{opts1}
    {\par\vspace{0.2em}\noindent\renewcommand{\arraystretch}{1.25}\begin{tabular}{@{}p{0.96\linewidth}@{}}}
    {\end{tabular}\par\vspace{0.2em}}
% opts2：两个选项一行，各占 50%
\newenvironment{opts2}
    {\par\vspace{0.2em}\noindent\renewcommand{\arraystretch}{1.25}\begin{tabular}{@{}p{0.475\linewidth}p{0.475\linewidth}@{}}}
    {\end{tabular}\par\vspace{0.2em}}
% opts4：四个选项一行，各占 25%
\newenvironment{opts4}
    {\par\vspace{0.2em}\noindent\renewcommand{\arraystretch}{1.25}\begin{tabular}{@{}p{0.235\linewidth}p{0.235\linewidth}p{0.235\linewidth}p{0.235\linewidth}@{}}}
    {\end{tabular}\par\vspace{0.2em}}

\begin{document}
% frag1..fragN
\end{document}
```

## 阶段三：排版规则（重点）

**标题**：全文无任何标题——不要「第x讲」章标题，不要书上小节标题（二、三、五…），内容连续排。用户明确去掉过。

**题干换行原则**：能一行就一行，但**编号小问必须分行**（2026-11 例4.2 用户明确规则，推翻旧"短小问合并一行"做法）。
- 删掉一切多余的 `\\`（行首的、`计算 \\` 之类的），让题干自然流动。
- 凡带 (1)(2)(3) 编号的小问，每个小问独占一行——再短也不合并（含"求下列不定积分：(1)…(2)…"这类并列小问）。
- 写法：引语后加 `\\` 换行，每个小问行尾加 `\\`（末行不加），同例6.21、例6.22 的排法。
- `cases` 环境内部换行必须保留；无编号的并列内容（如"求弧长、面积、体积"）不算小问，不强制分行。

**选项三种布局**（选择题必须用，禁止裸排导致选项被 `\hfill`/`\quad` 推到任意位置）：
- `opts4`：短选项（数字、单符号、两三字词）→ 四个一行各占 25%（例1.3、例1.6、例2.9）。
- `opts2`：中等选项（短公式、半行句子）→ 两个一行各占 50%（例1.5、例2.8、例2.13）。
- `opts1`：长选项（整句、含多个 \lim\limits）→ 每个独占一行（例2.12）。
- 判据：选项内容在 25%/50% 列宽内放得下就用更紧凑的档；拿不准先排紧凑档，渲染看有没有 cell 内折行。
- 选项里的分数用 `\frac`（小样式）防折行，题干保持 `\dfrac`。
- 写法：题干 `\examp{例x.x}{…则（\quad）.}` 结尾不带 `\\`，选项紧跟 `\begin{optsN}` 环境，cell 间用 `&`，行间用 `\\`。

**字符**：①②③④ 带圈数字在 template 字体链里是豆腐块（□），一律替换为 (1)(2)(3) 或（\chinese*）或 (a)(b)(c)。组装后 grep 全文确认无带圈字符（U+2460–U+2473）。

**命令命名坑**：不要定义 `\sectionmark`——与 LaTeX 内核命令重名，`\newcommand` 报错被忽略、调用静默不渲染，标题"消失"且排页数计算全错。

**间距（当前基准值，11pt 下两页正好排满 28 题）**：`\examp` 0.65em/0.3em，opts vspace 0.2em + arraystretch 1.25，probs itemsep 0.55em，页边距 top/bottom 0.8cm。增删内容后按"档位"循环调（见阶段四）。

## 阶段四：编译 + 逐页验证 + 间距调优

```bash
cd <exercises目录> && xelatex -interaction=nonstopmode -output-directory=pdf main.tex
grep "Output written" pdf/main.log          # 确认页数
command /usr/bin/gs -sDEVICE=png16m -r60 -o /tmp/x_p%d.png pdf/main.pdf   # zsh 里 gs 是 git status 别名，必须全路径
rm -f pdf/main.aux pdf/main.log pdf/main.out
```

- **良性错误**（可忽略）：`Two \documentclass or \documentstyle commands`（template.sty 自带 documentclass）、Menlo 字体探测警告。除此之外的 `!` 必须修（如 `Undefined control sequence` = 宏被删但调用还在，会丢内容）。
- **每次编译后必须逐页 Read 渲染图**，检查清单：每页排满无半空页、无溢出到下页的几行、无豆腐块、无游离字符（如字面 "em"）、选项列对齐、题目编号顺序正确。
- **main.tex 每题包 `\vbox{%` … `}` 整题不可分割**（2026-11 定案，main 与 random 一致）：放不下就整题移下页，机制上杜绝题干/选项跨页断开，不再用 `\pagebreak` 补洞（连锁串动、产生孤页，已废弃）。**陷阱：收尾那行写 `%}` 会把 `}` 注释掉**，首个 vbox 吞掉全文，报 99× "Missing } inserted" + "can't use `\end' in internal vertical mode"——收尾必须 `}` 独占一行。
- 小问行距：含大积分号（`\displaystyle\int`/`\iint`）的小问行尾用 `\\[0.6ex]` 替代 `\\`，否则上下两行积分号互相挤压；长选项（opts1）行间用 `\\[0.8ex]`。
- **页面填满哲学**（用户红线：半空页不可用）：内容比整页多几行时，逐档收紧间距直到排进整数页；内容比整页少很多时适度放松。档位示例（11pt）：宽松 `examp 0.85/0.45、itemsep 0.75` → 基准 `0.65/0.3、0.55` → 紧凑 `0.55/0.25、0.45` → 更紧 `0.45/0.18、0.35`。先试目标档，超页再降，直到恰好排满。
- 脚本改文件时避开 re.sub 替换串的转义坑（`\a` 会变响铃字符吃掉后面的字母、`\v`/`\n`/`\t` 同理会坏；曾把 `\arraystretch` 写成 `rraystretch`、把单反斜杠写成双反斜杠）。**用纯 `str.replace` + raw string，并对每处替换 assert 出现次数**，替换后 grep 复查。

## 随机版 main_random.tex（打乱刷题用）

- 由 main.tex 生成：按 `\examp{` 行切块（每题一个 unit，剔除注释/空行；main.tex 本身已 vbox 包裹，剥掉 unit 首的 `\vbox{%` 行和尾的 `}` 行即可），`random.Random(20261127).shuffle(units)`（固定 seed，重生成后顺序不变），单位数必须 assert（当前 205）且标签唯一，再统一包 `\vbox{%\n<unit>\n}` 输出。
- 生成后编译 + 逐页验证：PyMuPDF 逐页取首行，必须是 `例x.x` 开头（非题号开头=断题）；再查每页填充率（非末页 <80% 异常）。vbox 版典型：15 页、最低 86%。
- 60dpi 渲染图标签常误读（例1.11↔例11.11、15.16↔15.18 均翻车过），断题判定一律以文本层为准，渲染图只看版面观感。
- 题目内容改动只改 main.tex，然后重新跑生成脚本；勿直接改 main_random.tex。

## 交互约定

- 用中文向用户报告：录了哪些题、存疑点（哪几处是放大原图/反推确认的）、PDF 路径、页数。
- 编译通过 ≠ 完成，渲染检查通过才算完成。
- 用户常给局部反馈（"某题改一行""间距大一点"），改完重新编译渲染再报。
- 不主动 commit，等用户明确说提交。
