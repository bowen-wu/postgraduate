#include <stdio.h>

/**
 * http://oj.lgwenda.com/problem/1017
* 统计硬币
Description

假设一堆由1分、2分、5分组成的n个硬币总面值为m分，求一共有多少种可能的组合方式（某种面值的硬币可以数量可以为0）。


Input

输入数据第一行有一个正整数T，表示有T组测试数据。接下来的T行，每行有两个数n，m，n和m的含义同上。


Output

对于每组测试数据，请输出可能的组合方式数，每组输出占一行。
*/

int main() {
    int num;
    scanf("%d", &num);
    for (int i = 0; i < num; i++) {
        int n, m, total = 0;
        scanf("%d%d", &n, &m);
        for (int i = 0; 1 * i <= m && i <= n; i++) {
            for (int j = 0; 1 * i + 2 * j <= m && i + j <= n; j++) {
                for (int k = 0; 1 * i + 2 * j + 5 * k <= m && i + j + k <= n; k++) {
                    if (i + j + k == n && 1 * i + 2 * j + 5 * k == m) {
                        total++;
                    }
                }
            }
        }
        printf("%d\n", total);
    }
}
