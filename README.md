## [markdown to pdf link](https://md-to-pdf.fly.dev/)

1. 网站所需 css 可参见 /css/md-to-pdf.css
2. Engine 选择 **wkhtmltopdf**

## LateX

根目录执行：

1. `xelatex -output-directory=math/latex ./math/latex/demo.tex`
2. `xelatex -interaction=nonstopmode -output-directory=math/latex ./math/latex/demo.tex` (遇到错误也不停下来)

