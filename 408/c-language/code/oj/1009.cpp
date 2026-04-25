#include <stdio.h>

/*
 * http://oj.lgwenda.com/problem/1009
 * ASCII码
Description

相信大家一定都知道大名鼎鼎的ASCII码，这次给你的任务是输入数字（表示ASCII码），输出相对应的字符信息


Input

第一行为一个整数T（1<=T<=1000）。

接下来包括T个正整数，由空白符分割。（空白符包括空格、换行、制表符）

这些整数不会小于32。


Output

在一行内输出相应的字符信息。（注意不要输出任何多余的字符）
 */

int main() {
    int total;
    scanf("%d", &total);
    for (int i = 0;i < total ;i++) {
        int num;
        scanf("%d", &num);
        printf("%c", (char)num);
    }

    printf("\n");
    return 0;
}
