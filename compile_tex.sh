#!/bin/bash
# 并行编译所有 .tex 文件，输出 PDF 到同级目录，并删除临时文件

find . -type f -name "*.tex" | while read texfile; do
    texdir=$(dirname "$texfile")
    echo "Compiling $texfile ..."

    # 使用后台任务 (&) 并行执行
    xelatex -interaction=nonstopmode -output-directory="$texdir" "$texfile" &

done

# 等待所有后台任务完成
wait

# 删除所有临时文件
find . -type f \( -name "*.aux" -o -name "*.log" -o -name "*.out" -o -name "*.toc" \) -delete

echo "🎉🎉All .tex files compiled🎉🎉"
