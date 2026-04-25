#include <stdio.h>

/*
 * http://oj.lgwenda.com/problem/1013
* 奇怪的信
Description

有一天, 小明收到一张奇怪的信, 信上要小明计算出给定数各个位上数字为偶数的和。

例如：5548，结果为12，等于 4 + 8 。

小明很苦恼，想请你帮忙解决这个问题。


Input

输入数据有多组。每组占一行，只有一个整整数，保证数字在32位整型范围内。


Output

对于每组输入数据，输出一行，每两组数据之间有一个空行。
*/

int main() {
    int num;
    int first = 1;
    while (scanf("%d", &num) == 1) {
        int total = 0;
        if (first != 1) {
            printf("\n");
        }
        first = 0;
        while (num != 0) {
            int current = num % 10;
            if (current % 2 == 0) {
                total += current;
            }
            num /= 10;
        }
        printf("%d\n", total);
    }
}
