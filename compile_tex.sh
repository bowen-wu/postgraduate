#!/usr/bin/env bash
# 只编译有变更的 .tex 文件，并行输出 PDF 并删除临时文件

# 获取已修改或新增的 .tex 文件
changed_files=$(git ls-files -m -o --exclude-standard "*.tex")

# 去掉首尾空格和换行，保证每个文件路径干净
clean_files=()
while IFS= read -r line; do
    # 删除首尾空格
    file=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    # 只添加非空文件
    [ -n "$file" ] && clean_files+=("$file")
done <<< "$changed_files"

if [ ${#clean_files[@]} -eq 0 ]; then
    echo " ⛔ No changed .tex files to compile. ⛔ "
else
    for texfile in "${clean_files[@]}"; do
        texdir=$(dirname "$texfile")
        texbase=$(basename "$texfile")
        mkdir -p "$texdir/pdf"
        echo "Compiling $texfile ..."
        (
            cd "$texdir" || exit 1
            xelatex -interaction=nonstopmode -output-directory="pdf" "$texbase"
        ) &
    done

    wait

    # 删除临时文件
    for texfile in "${clean_files[@]}"; do
        texdir=$(dirname "$texfile")
        find "$texdir/pdf" -maxdepth 1 -type f \( -name "*.aux" -o -name "*.log" -o -name "*.out" \) -delete
    done

    echo "🎉🎉All changed .tex files compiled🎉🎉"
fi
